// Acesso ao banco do módulo de gestão. Usado tanto pelo painel (/api/admin/gestor)
// quanto pela API dos agentes (/api/v1), para que as regras sejam as mesmas.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookings, cleanTitle, orderDraft } from "@/lib/google/bookings";
import { createOrderEvent, deleteOrderEvent, googleAgenda, googleBusyDays, isConfigured as googleConfigured } from "@/lib/google/calendar";
import { encodeLink, LINK_PREFIX, linkKey, linksFromRows } from "@/lib/google/links";
import {
  addDays,
  allowedTransitions,
  availabilityOf,
  balanceDueDate,
  calcQuote,
  canTransition,
  computeAlerts,
  computeKpis,
  dateToISO,
  formatBRL,
  formatDateBR,
  DEFAULT_SERVICES,
  DEFAULT_SERVICES_VERSION,
  isDateString,
  isOpenStatus,
  isOrderStatus,
  isSettingKey,
  normalizePhone,
  parseSettings,
  RuleError,
  STATUS_LABELS,
  todayISO,
  validateSetting,
  type CalendarFacts,
  type OrderStatus,
  type QuoteItem,
  type Settings,
} from "./rules";

type Tx = Prisma.TransactionClient;
export type Actor = "admin" | "margot" | "sistema";

const SOURCES = ["instagram", "indicacao", "site", "cerimonialista", "outro"];
const PAYMENT_KINDS = ["sinal", "saldo", "outro"];
const PAYMENT_STATUSES = ["a_receber", "recebido", "atrasado", "cancelado"];

const toDbDate = (date: string) => new Date(`${date}T00:00:00Z`);

function requireDate(value: unknown, field = "data"): string {
  if (!isDateString(value)) throw new RuleError("data_invalida", `Informe ${field} no formato AAAA-MM-DD.`, 400);
  return value;
}

function requireInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new RuleError("valor_invalido", `${field} precisa ser um número inteiro.`, 400);
  return n;
}

function str(value: unknown, max = 2000): string {
  return value === undefined || value === null ? "" : String(value).trim().slice(0, max);
}

// ─── Configurações e serviços ────────────────────────────────

export async function getSettings(db: Tx | typeof prisma = prisma): Promise<Settings> {
  const rows = await db.setting.findMany();
  return parseSettings(rows);
}

export async function saveSettings(input: Record<string, unknown>): Promise<Settings> {
  const entries: { key: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(input ?? {})) {
    if (!isSettingKey(key)) continue;
    const result = validateSetting(key, raw);
    if (!result.ok) throw new RuleError("configuracao_invalida", result.error, 400);
    entries.push({ key, value: result.value });
  }
  await prisma.$transaction(
    entries.map((e) =>
      prisma.setting.upsert({ where: { key: e.key }, create: e, update: { value: e.value } }),
    ),
  );
  return getSettings();
}

const SERVICES_VERSION_KEY = "servicosPadraoVersao";

/**
 * Cria os serviços padrão que ainda não existem. Roda uma vez por versão, então
 * um serviço que o dono renomear ou desativar não é recriado depois.
 */
export async function ensureDefaultServices() {
  const flag = await prisma.setting.findUnique({ where: { key: SERVICES_VERSION_KEY } });
  if (Number(flag?.value ?? 0) >= DEFAULT_SERVICES_VERSION) return;
  const existing = await prisma.service.findMany({ select: { name: true } });
  const names = new Set(existing.map((s) => s.name.trim().toLowerCase()));
  const missing = DEFAULT_SERVICES.filter((s) => !names.has(s.name.toLowerCase()));
  // Bancos criados antes do controle de versão já têm os serviços da versão 1.
  const toCreate = existing.length > 0 && !flag ? missing.filter((s) => s.sortOrder > 2) : missing;
  if (toCreate.length) await prisma.service.createMany({ data: toCreate });
  await prisma.setting.upsert({
    where: { key: SERVICES_VERSION_KEY },
    create: { key: SERVICES_VERSION_KEY, value: String(DEFAULT_SERVICES_VERSION) },
    update: { value: String(DEFAULT_SERVICES_VERSION) },
  });
}

export async function listServices(opts: { activeOnly?: boolean } = {}) {
  await ensureDefaultServices();
  const rows = await prisma.service.findMany({
    where: opts.activeOnly ? { active: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    priceCents: s.priceCents,
    isAddon: s.isAddon,
    active: s.active,
    sortOrder: s.sortOrder,
  }));
}

export async function saveService(input: Record<string, any>) {
  const data = {
    name: str(input.name, 120),
    description: str(input.description, 1000),
    priceCents: requireInt(input.priceCents, "Preço"),
    isAddon: Boolean(input.isAddon),
    active: input.active === undefined ? true : Boolean(input.active),
    sortOrder: Number.isInteger(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
  };
  if (!data.name) throw new RuleError("nome_obrigatorio", "Dê um nome ao serviço.", 400);
  if (input.id) {
    return prisma.service.update({ where: { id: requireInt(input.id, "id") }, data });
  }
  return prisma.service.create({ data });
}

// ─── Calendário ──────────────────────────────────────────────

export async function getCalendarFacts(db: Tx | typeof prisma = prisma): Promise<CalendarFacts> {
  // Sequencial de propósito: dentro de uma transação a conexão é única.
  const blocked = await db.blockedDate.findMany({ select: { date: true } });
  const reservations = await db.reservation.findMany({
    where: { activeDate: { not: null } },
    select: { date: true, kind: true, orderId: true },
  });
  // Compromissos da Google Agenda do Leonardo também ocupam o dia.
  const google = await googleBusyDays();
  // Pedidos criados a partir de um casamento que já estava na Google Agenda (ver google/links.ts).
  const links = linksFromRows(await db.setting.findMany({ where: { key: { startsWith: LINK_PREFIX } } }));
  const manual = blocked.map((b) => b.date.toISOString().slice(0, 10));
  return {
    blocked: [...manual, ...google.map((g) => g.date)],
    reservations: reservations.map((r) => ({ date: dateToISO(r.date)!, kind: r.kind, orderId: r.orderId })),
    manualBlocked: manual,
    googleDays: google.map(({ date, summary, kind, eventId }) => ({ date, summary, kind, eventId })),
    googleLinks: links,
  };
}

export async function checkAvailability(date: unknown) {
  const d = requireDate(date);
  const facts = await getCalendarFacts();
  const result = availabilityOf(d, facts);
  return { data: d, status: result.status, livre: result.status === "livre", passado: d < todayISO() };
}

function parseMonth(year: unknown, month: unknown) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new RuleError("mes_invalido", "Informe ano e mês (1 a 12).", 400);
  }
  return { y, m };
}

function monthDays(y: number, m: number, facts: CalendarFacts) {
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const days: { data: string; status: string; orderId: number | null }[] = [];
  for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) {
    const a = availabilityOf(d, facts);
    days.push({ data: d, status: a.status, orderId: a.orderId });
  }
  return days;
}

export async function monthAvailability(year: unknown, month: unknown) {
  const { y, m } = parseMonth(year, month);
  return { ano: y, mes: m, dias: monthDays(y, m, await getCalendarFacts()) };
}

/**
 * Calendário do painel (só o dono vê): a disponibilidade do mês e, nos dias travados pela Google Agenda, o nome do
 * compromisso. A API para agentes (/api/v1) continua usando monthAvailability, que não leva nome de compromisso.
 */
export async function monthAgenda(year: unknown, month: unknown) {
  const { y, m } = parseMonth(year, month);
  const facts = await getCalendarFacts();
  const manual = new Set(facts.manualBlocked ?? []);
  const google = new Map((facts.googleDays ?? []).map((g) => [g.date, g]));
  const dias = monthDays(y, m, facts).map((d) => {
    const g = google.get(d.data);
    const origem: "pedido" | "bloqueio" | "google" | null = d.orderId
      ? "pedido"
      : d.status === "livre"
        ? null
        : g && !manual.has(d.data)
          ? "google"
          : "bloqueio";
    const pedido = g?.eventId ? (facts.googleLinks ?? []).find((l) => l.eventId === g.eventId)?.orderId ?? null : null;
    return {
      ...d,
      origem,
      google:
        origem === "google" && g
          ? { id: g.eventId ?? "", titulo: cleanTitle(g.summary), casamento: g.kind === "casamento", pedido }
          : null,
    };
  });
  return { ano: y, mes: m, dias };
}

// ─── Pedidos ─────────────────────────────────────────────────

const orderInclude = {
  client: true,
  quotes: { orderBy: { createdAt: "desc" } },
  reservations: { orderBy: { createdAt: "desc" } },
  payments: { orderBy: [{ dueDate: "asc" }, { id: "asc" }] },
  history: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.OrderInclude;

type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function serializeOrder(o: FullOrder) {
  const active = o.reservations.find((r) => r.activeDate);
  const status = o.status as OrderStatus;
  return {
    id: o.id,
    status,
    statusLabel: STATUS_LABELS[status] ?? o.status,
    proximosStatus: isOrderStatus(o.status) ? allowedTransitions(status) : [],
    eventDate: dateToISO(o.eventDate),
    eventTime: o.eventTime,
    duration: o.duration,
    publicToken: o.publicToken,
    venue: o.venue,
    city: o.city,
    serviceIds: o.serviceIds,
    notes: o.notes,
    lostReason: o.lostReason,
    createdBy: o.createdBy,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    client: {
      id: o.client.id,
      name: o.client.name,
      phone: o.client.phone,
      email: o.client.email,
      source: o.client.source,
      referredBy: o.client.referredBy,
      notes: o.client.notes,
      legalName: o.client.legalName,
      document: o.client.document,
      address: o.client.address,
    },
    reserva: active
      ? {
          id: active.id,
          date: dateToISO(active.date),
          kind: active.kind,
          expiresAt: active.expiresAt?.toISOString() ?? null,
        }
      : null,
    quotes: o.quotes.map((q) => ({
      id: q.id,
      items: q.items as unknown as QuoteItem[],
      discountCents: q.discountCents,
      totalCents: q.totalCents,
      depositCents: q.depositCents,
      validUntil: dateToISO(q.validUntil),
      pdfUrl: q.pdfUrl,
      sentAt: q.sentAt?.toISOString() ?? null,
      createdAt: q.createdAt.toISOString(),
    })),
    payments: o.payments.map((p) => ({
      id: p.id,
      kind: p.kind,
      amountCents: p.amountCents,
      dueDate: dateToISO(p.dueDate),
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
      method: p.method,
      externalId: p.externalId,
    })),
    history: o.history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      actor: h.actor,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

export type OrderView = ReturnType<typeof serializeOrder>;

async function loadOrder(id: number, db: Tx | typeof prisma = prisma) {
  const order = await db.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw new RuleError("pedido_nao_encontrado", `Pedido #${id} não encontrado.`, 404);
  return order;
}

export async function getOrder(id: unknown): Promise<OrderView> {
  return serializeOrder(await loadOrder(requireInt(id, "id")));
}

export async function listOrders(filter: { status?: unknown; q?: unknown } = {}) {
  const where: Prisma.OrderWhereInput = {};
  if (filter.status) {
    const statuses = String(filter.status).split(",").filter(isOrderStatus);
    where.status = { in: statuses };
  }
  if (filter.q) {
    const q = String(filter.q);
    where.OR = [
      { client: { name: { contains: q, mode: "insensitive" } } },
      { client: { phone: { contains: q.replace(/\D/g, "") || q } } },
      { venue: { contains: q, mode: "insensitive" } },
    ];
  }
  const orders = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: [{ eventDate: "asc" }, { id: "desc" }],
    take: 300,
  });
  return orders.map(serializeOrder);
}

async function upsertClient(input: Record<string, any>, tx: Tx) {
  const name = str(input?.name, 120);
  const phone = normalizePhone(str(input?.phone, 40));
  if (!name) throw new RuleError("nome_obrigatorio", "Informe o nome do cliente.", 400);
  if (phone.length < 10) throw new RuleError("telefone_invalido", "Informe o WhatsApp com DDD.", 400);
  const source = SOURCES.includes(input?.source) ? input.source : "outro";
  const data = {
    name,
    email: str(input?.email, 200),
    source,
    referredBy: str(input?.referredBy, 200),
  };
  const existing = await tx.client.findUnique({ where: { phone } });
  if (existing) {
    return tx.client.update({
      where: { id: existing.id },
      data: {
        name,
        ...(data.email && { email: data.email }),
        ...(input?.source && { source }),
        ...(data.referredBy && { referredBy: data.referredBy }),
      },
    });
  }
  return tx.client.create({ data: { ...data, phone, notes: str(input?.notes) } });
}

/**
 * Pedido que nasce de um casamento já anotado na Google Agenda (só pelo painel; a Margot e a API de agentes não ligam
 * pedido a evento). O evento tem de existir, ser do mesmo dia do pedido e ainda não ter pedido.
 */
async function resolveGoogleLink(eventId: string, eventDate: string | null) {
  const item = (await googleAgenda()).items.find((i) => i.id === eventId);
  if (!item) {
    throw new RuleError("evento_nao_encontrado", "Não achei esse casamento na Google Agenda (ela pode estar fora do ar). Tente de novo em instantes.", 404);
  }
  if (eventDate !== item.date) {
    throw new RuleError(
      "data_diferente",
      `Esse casamento está na Google Agenda em ${formatDateBR(item.date)}. Deixe a data do pedido igual, ou crie um pedido sem ligar a ele.`,
      409,
    );
  }
  const links = linksFromRows(await prisma.setting.findMany({ where: { key: { startsWith: LINK_PREFIX } } }));
  const taken = links.find((l) => l.eventId === eventId);
  if (taken) throw new RuleError("evento_ja_ligado", `Esse casamento já tem o pedido #${taken.orderId}.`, 409);
  return { eventId, date: item.date };
}

export async function createOrder(input: Record<string, any>, actor: Actor) {
  const eventDate = input.eventDate ? requireDate(input.eventDate, "a data do evento") : null;
  const serviceIds = Array.isArray(input.serviceIds)
    ? input.serviceIds.map((n: unknown) => requireInt(n, "serviceIds"))
    : [];
  const googleEventId = actor === "admin" && typeof input.googleEventId === "string" ? input.googleEventId.trim() : "";
  const googleLink = googleEventId ? await resolveGoogleLink(googleEventId, eventDate) : null;

  const id = await prisma.$transaction(async (tx) => {
    const client = await upsertClient(input.client ?? {}, tx);
    const order = await tx.order.create({
      data: {
        clientId: client.id,
        eventDate: eventDate ? toDbDate(eventDate) : null,
        eventTime: str(input.eventTime, 20),
        venue: str(input.venue, 300),
        city: str(input.city, 120),
        serviceIds,
        notes: str(input.notes),
        createdBy: actor === "margot" ? "margot" : "admin",
      },
    });
    await tx.orderHistory.create({
      data: { orderId: order.id, toStatus: "novo", actor, note: googleLink ? "Pedido criado a partir da Google Agenda" : "Pedido criado" },
    });
    if (googleLink) {
      await tx.setting.create({ data: { key: linkKey(order.id), value: encodeLink(googleLink.eventId, googleLink.date) } });
    }
    return order.id;
  });

  const order = await getOrder(id);
  const availability = eventDate ? await checkAvailability(eventDate) : null;
  return { order, disponibilidade: availability };
}

export async function updateOrder(id: unknown, input: Record<string, any>, actor: Actor) {
  const orderId = requireInt(id, "id");
  const current = await loadOrder(orderId);
  const data: Prisma.OrderUpdateInput = {};

  if (input.eventDate !== undefined) {
    const next = input.eventDate ? requireDate(input.eventDate, "a data do evento") : null;
    if (current.reservations.some((r) => r.activeDate) && next !== dateToISO(current.eventDate)) {
      throw new RuleError(
        "data_reservada",
        "Este pedido já tem a data reservada. Libere a reserva antes de trocar a data.",
        409,
      );
    }
    data.eventDate = next ? toDbDate(next) : null;
  }
  for (const field of ["eventTime", "venue", "city", "notes", "lostReason", "duration"] as const) {
    if (input[field] !== undefined) data[field] = str(input[field]);
  }
  if (Array.isArray(input.serviceIds)) {
    data.serviceIds = input.serviceIds.map((n: unknown) => requireInt(n, "serviceIds"));
  }
  if (input.client && typeof input.client === "object") {
    const c = input.client;
    const clientData: Prisma.ClientUpdateInput = {};
    if (c.name !== undefined) clientData.name = str(c.name, 120);
    if (c.email !== undefined) clientData.email = str(c.email, 200);
    if (c.referredBy !== undefined) clientData.referredBy = str(c.referredBy, 200);
    if (c.notes !== undefined) clientData.notes = str(c.notes);
    if (c.legalName !== undefined) clientData.legalName = str(c.legalName, 200);
    if (c.document !== undefined) clientData.document = str(c.document, 40);
    if (c.address !== undefined) clientData.address = str(c.address, 300);
    if (c.source !== undefined && SOURCES.includes(c.source)) clientData.source = c.source;
    if (c.phone !== undefined) {
      const phone = normalizePhone(str(c.phone, 40));
      if (phone.length < 10) throw new RuleError("telefone_invalido", "Informe o WhatsApp com DDD.", 400);
      clientData.phone = phone;
    }
    if (Object.keys(clientData).length) {
      await prisma.client.update({ where: { id: current.clientId }, data: clientData }).catch((e) => {
        if (e?.code === "P2002") throw new RuleError("telefone_em_uso", "Outro cliente já usa esse WhatsApp.", 409);
        throw e;
      });
    }
  }
  if (Object.keys(data).length) await prisma.order.update({ where: { id: orderId }, data });

  if (input.status !== undefined && input.status !== current.status) {
    return changeStatus(orderId, input.status, actor, str(input.note));
  }
  return getOrder(orderId);
}

// ─── Status e efeitos colaterais ─────────────────────────────

export async function changeStatus(id: unknown, to: unknown, actor: Actor, note = "") {
  const orderId = requireInt(id, "id");
  if (!isOrderStatus(to)) throw new RuleError("status_invalido", "Status desconhecido.", 400);
  // Busca a Google Agenda antes da transação (fica em cache), para não segurar o banco esperando a rede.
  if (to === "reservado" || to === "confirmado") await googleBusyDays();

  await prisma.$transaction(async (tx) => {
    const order = await loadOrder(orderId, tx);
    const from = order.status as OrderStatus;
    if (from === to) return;
    if (!canTransition(from, to)) {
      throw new RuleError(
        "transicao_invalida",
        `Não é possível ir de "${STATUS_LABELS[from]}" para "${STATUS_LABELS[to]}".`,
        409,
      );
    }
    const settings = await getSettings(tx);

    if (to === "reservado") await reserveInTx(order, settings, tx);
    if (to === "confirmado") await confirmInTx(order, settings, tx);
    if (to === "perdido" || to === "cancelado" || to === "novo" || to === "aguardando_resposta") {
      if (to === "perdido" || to === "cancelado") {
        await cancelPendingPayments(orderId, tx);
        // O casamento continua na Google Agenda do dono, mas já não tem pedido: volta a aparecer como "só na Google".
        await tx.setting.deleteMany({ where: { key: linkKey(orderId) } });
      }
      if (from === "reservado" || from === "confirmado") await releaseInTx(orderId, tx);
    }

    await tx.order.update({ where: { id: orderId }, data: { status: to } });
    await tx.orderHistory.create({ data: { orderId, fromStatus: from, toStatus: to, actor, note } });
  });

  await syncOrderCalendar(orderId);
  return getOrder(orderId);
}

// ─── Casamentos da Google Agenda que viram pedido (só o painel usa) ───

/** Pedidos ligados a um casamento da Google Agenda, pelo id do evento. */
export async function googleLinkedOrders() {
  const links = linksFromRows(await prisma.setting.findMany({ where: { key: { startsWith: LINK_PREFIX } } }));
  const out = new Map<string, { orderId: number; client: string; status: string; statusLabel: string; place: string; time: string }>();
  if (!links.length) return out;
  const orders = await prisma.order.findMany({
    where: { id: { in: links.map((l) => l.orderId) } },
    include: { client: { select: { name: true } } },
  });
  const byId = new Map(orders.map((o) => [o.id, o]));
  for (const l of links) {
    const o = byId.get(l.orderId);
    if (!o) continue;
    out.set(l.eventId, {
      orderId: o.id,
      client: o.client.name,
      status: o.status,
      statusLabel: STATUS_LABELS[o.status as OrderStatus] ?? o.status,
      place: [o.venue, o.city].filter(Boolean).join(", "),
      time: o.eventTime,
    });
  }
  return out;
}

/** O que o Novo pedido já traz para um casamento da Google Agenda (nome do casal, data, hora, local). */
export async function googleBookingDraft(eventId: unknown) {
  const id = str(eventId, 300);
  const agenda = await googleAgenda();
  const booking = bookings(agenda.items, "0000-01-01").find((b) => b.id === id);
  if (!booking) throw new RuleError("evento_nao_encontrado", "Não achei esse casamento na Google Agenda.", 404);
  const linked = (await googleLinkedOrders()).get(id);
  return { id, link: booking.link, ...orderDraft(booking), pedido: linked?.orderId ?? null };
}

/** Liga um pedido já existente a um casamento da Google Agenda do mesmo dia (o que o "Novo pedido" faz ao criar). */
export async function linkOrderToGoogle(orderId: unknown, eventId: unknown) {
  const id = requireInt(orderId, "id");
  const order = await loadOrder(id);
  if (["perdido", "cancelado", "realizado"].includes(order.status)) {
    throw new RuleError("status_invalido", "Reabra o pedido antes de ligar à Google Agenda.", 409);
  }
  const existing = await prisma.setting.findUnique({ where: { key: linkKey(id) } });
  if (existing) throw new RuleError("ja_ligado", "Este pedido já está ligado a um casamento da Google Agenda.", 409);
  const link = await resolveGoogleLink(str(eventId, 300), dateToISO(order.eventDate));
  await prisma.$transaction(async (tx) => {
    await tx.setting.create({ data: { key: linkKey(id), value: encodeLink(link.eventId, link.date) } });
    await tx.orderHistory.create({
      data: { orderId: id, fromStatus: order.status, toStatus: order.status, actor: "admin", note: "Ligado ao casamento da Google Agenda" },
    });
  });
  return orderGoogleLink(id);
}

/** Casamentos de hoje em diante na Google Agenda, com o que o pedido já traria e o pedido que já existe, se existir. */
export async function listGoogleBookings() {
  const [agenda, linked] = await Promise.all([googleAgenda(), googleLinkedOrders()]);
  return bookings(agenda.items, todayISO()).map((b) => ({
    id: b.id,
    ...orderDraft(b),
    title: b.title,
    also: b.also,
    pedido: linked.get(b.id)?.orderId ?? null,
  }));
}

/**
 * De qual casamento da Google Agenda este pedido veio, se veio de um. Sem vínculo, sugere o casamento da agenda no
 * mesmo dia que ainda não tem pedido (ex.: pedido cancelado e reaberto perde o vínculo, e o dia passa a aparecer ocupado).
 */
export async function orderGoogleLink(orderId: unknown) {
  const id = requireInt(orderId, "id");
  const row = await prisma.setting.findUnique({ where: { key: linkKey(id) } });
  const link = row ? linksFromRows([row])[0] : undefined;
  if (!link) {
    const order = await prisma.order.findUnique({ where: { id }, select: { eventDate: true, status: true } });
    const date = dateToISO(order?.eventDate ?? null);
    if (!order || !date || ["perdido", "cancelado", "realizado"].includes(order.status)) return { vinculo: null, sugestao: null };
    const free = (await listGoogleBookings()).find((b) => b.eventDate === date && b.pedido === null);
    return { vinculo: null, sugestao: free ? { id: free.id, titulo: free.title } : null };
  }
  const item = (await googleAgenda()).items.find((i) => i.id === link.eventId);
  return { vinculo: { data: link.date, titulo: item ? cleanTitle(item.title) : null, link: item?.link ?? "" } };
}

// ─── Google Agenda ───────────────────────────────────────────

export function siteUrl() {
  const host = process.env["SITE_URL"] || process.env["VERCEL_PROJECT_PRODUCTION_URL"];
  return host ? (host.startsWith("http") ? host : `https://${host}`) : "";
}

/**
 * Deixa a Google Agenda igual ao banco: pedido confirmado ganha evento; reserva liberada perde o evento.
 * Nunca derruba a operação principal: erros só vão para o log.
 */
export async function syncOrderCalendar(orderId: number) {
  if (!googleConfigured()) return;
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { client: true, reservations: true, quotes: { orderBy: { createdAt: "desc" }, take: 1 }, payments: true },
    });
    if (!order) return;
    for (const r of order.reservations) {
      if (!r.activeDate && r.googleEventId) {
        await deleteOrderEvent(r.googleEventId, order.id);
        await prisma.reservation.update({ where: { id: r.id }, data: { googleEventId: null } });
      }
    }
    const active = order.reservations.find((r) => r.activeDate && r.kind === "confirmada");
    if (!active || active.googleEventId) return;
    const quote = order.quotes[0];
    const items = ((quote?.items as unknown as QuoteItem[]) ?? []).map((i) => i.name);
    const balance = order.payments.find((p) => p.kind === "saldo" && p.status !== "cancelado");
    const lines = [
      items.length ? `Serviços: ${items.join(" + ")}` : "",
      quote ? `Total: ${formatBRL(quote.totalCents)} (sinal ${formatBRL(quote.depositCents)})` : "",
      balance ? `Saldo: ${formatBRL(balance.amountCents)} — ${balance.status === "recebido" ? "pago" : "a receber"}` : "",
      `Cliente: ${order.client.name} · WhatsApp ${order.client.phone}`,
      order.notes ? `Observações: ${order.notes}` : "",
      siteUrl() ? `Pedido no painel: ${siteUrl()}/admin/pedidos/${order.id}` : "",
    ].filter(Boolean);
    const eventId = await createOrderEvent({
      orderId: order.id,
      date: dateToISO(active.date)!,
      time: order.eventTime,
      durationHours: 3,
      title: `💍 ${items[0] ?? "Eu Casei de Lafer"} — ${order.client.name}`,
      location: [order.venue, order.city].filter(Boolean).join(", "),
      description: lines.join("\n"),
    });
    await prisma.reservation.update({ where: { id: active.id }, data: { googleEventId: eventId } });
  } catch (e) {
    console.error(`[google] sincronizar pedido #${orderId}`, e);
  }
}

async function reserveInTx(order: FullOrder, settings: Settings, tx: Tx) {
  const date = dateToISO(order.eventDate);
  if (!date) throw new RuleError("sem_data", "Defina a data do evento antes de reservar.", 409);
  if (date < todayISO()) throw new RuleError("data_passada", "Essa data já passou.", 409);

  const facts = await getCalendarFacts(tx);
  const taken = availabilityOf(date, facts, order.id);
  if (taken.status !== "livre") {
    throw new RuleError("data_ocupada", `${date.split("-").reverse().join("/")} já está ocupada.`, 409);
  }

  const existing = order.reservations.find((r) => r.activeDate);
  if (!existing) {
    // Pedido ligado a um casamento da Google Agenda: a reserva guarda o id desse evento, e o painel não cria outro.
    const link = (facts.googleLinks ?? []).find((l) => l.orderId === order.id && l.date === date);
    try {
      await tx.reservation.create({
        data: {
          orderId: order.id,
          date: toDbDate(date),
          activeDate: toDbDate(date),
          kind: "provisoria",
          expiresAt: new Date(Date.now() + settings.provisionalHours * 3_600_000),
          googleEventId: link?.eventId ?? null,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2002") throw new RuleError("data_ocupada", "Essa data acabou de ser reservada por outro pedido.", 409);
      throw e;
    }
  }
  await ensurePayments(order, settings, date, tx);
}

/** Cria sinal e saldo a partir do último orçamento, se ainda não existirem. */
async function ensurePayments(order: FullOrder, settings: Settings, eventDate: string, tx: Tx) {
  const quote = order.quotes[0];
  if (!quote) return;
  const open = order.payments.filter((p) => p.status !== "cancelado");
  const today = todayISO();
  if (!open.some((p) => p.kind === "sinal")) {
    await tx.payment.create({
      data: {
        orderId: order.id,
        kind: "sinal",
        amountCents: quote.depositCents,
        dueDate: toDbDate(addDays(today, Math.max(1, Math.ceil(settings.provisionalHours / 24)))),
      },
    });
  }
  const balance = quote.totalCents - quote.depositCents;
  if (balance > 0 && !open.some((p) => p.kind === "saldo")) {
    await tx.payment.create({
      data: {
        orderId: order.id,
        kind: "saldo",
        amountCents: balance,
        dueDate: toDbDate(balanceDueDate(eventDate, settings.balanceDaysBefore, today)),
      },
    });
  }
}

async function confirmInTx(order: FullOrder, settings: Settings, tx: Tx) {
  // Garante a reserva (cria se ainda não existir) e a torna definitiva.
  let reservation = order.reservations.find((r) => r.activeDate);
  if (!reservation) {
    await reserveInTx(order, settings, tx);
    reservation = (await tx.reservation.findFirst({ where: { orderId: order.id, activeDate: { not: null } } }))!;
  }
  let blockedDateId = reservation.blockedDateId;
  if (!blockedDateId) {
    // O calendário público lê BlockedDate: a data aparece como ocupada no site.
    const date = dateToISO(reservation.date)!;
    const blocked = await tx.blockedDate.create({
      data: { date: new Date(`${date}T12:00:00Z`), label: "Reservado" },
    });
    blockedDateId = blocked.id;
  }
  await tx.reservation.update({
    where: { id: reservation.id },
    data: { kind: "confirmada", expiresAt: null, blockedDateId },
  });
}

async function releaseInTx(orderId: number, tx: Tx) {
  const active = await tx.reservation.findMany({ where: { orderId, activeDate: { not: null } } });
  for (const r of active) {
    if (r.blockedDateId) await tx.blockedDate.deleteMany({ where: { id: r.blockedDateId } });
    await tx.reservation.update({
      where: { id: r.id },
      data: { activeDate: null, releasedAt: new Date(), blockedDateId: null },
    });
  }
}

async function cancelPendingPayments(orderId: number, tx: Tx) {
  await tx.payment.updateMany({
    where: { orderId, status: { in: ["a_receber", "atrasado"] } },
    data: { status: "cancelado" },
  });
}

/** Reserva provisória da data do pedido (atalho usado pela Margot). */
export async function reserveOrder(id: unknown, actor: Actor) {
  const orderId = requireInt(id, "id");
  const order = await loadOrder(orderId);
  if (order.status === "reservado" || order.status === "confirmado") return getOrder(orderId);
  return changeStatus(orderId, "reservado", actor, "Reserva provisória");
}

// ─── Orçamentos ──────────────────────────────────────────────

export async function createQuote(id: unknown, input: Record<string, any>, actor: Actor) {
  const orderId = requireInt(id, "id");
  const order = await loadOrder(orderId);
  const settings = await getSettings();
  const services = await listServices();

  let items: QuoteItem[];
  if (Array.isArray(input.items) && input.items.length) {
    items = input.items.map((i: any) => ({
      serviceId: i.serviceId ? requireInt(i.serviceId, "serviceId") : null,
      name: str(i.name, 200),
      priceCents: requireInt(i.priceCents, `Valor de ${i.name ?? "item"}`),
    }));
  } else {
    const ids: number[] = Array.isArray(input.serviceIds) && input.serviceIds.length ? input.serviceIds.map(Number) : order.serviceIds;
    items = ids.map((sid) => {
      const s = services.find((x) => x.id === sid);
      if (!s) throw new RuleError("servico_nao_encontrado", `Serviço #${sid} não existe.`, 400);
      if (!s.active) throw new RuleError("servico_inativo", `"${s.name}" está desativado.`, 400);
      return { serviceId: s.id, name: s.name, priceCents: s.priceCents };
    });
  }
  const discountCents = input.discountCents ? requireInt(input.discountCents, "Desconto") : 0;
  const totals = calcQuote(items, discountCents, settings.depositPercent);
  const validDays = input.validDays ? requireInt(input.validDays, "Validade") : 7;
  const markSent = input.markSent !== false;

  await prisma.$transaction(async (tx) => {
    await tx.quote.create({
      data: {
        orderId,
        items: items as unknown as Prisma.InputJsonValue,
        discountCents,
        totalCents: totals.totalCents,
        depositCents: totals.depositCents,
        validUntil: toDbDate(addDays(todayISO(), validDays)),
        pdfUrl: str(input.pdfUrl, 500),
        sentAt: markSent ? new Date() : null,
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { serviceIds: items.map((i) => i.serviceId).filter((n): n is number => n !== null) },
    });
    if (markSent && order.status === "novo") {
      await tx.order.update({ where: { id: orderId }, data: { status: "orcamento_enviado" } });
      await tx.orderHistory.create({
        data: { orderId, fromStatus: "novo", toStatus: "orcamento_enviado", actor, note: "Orçamento enviado" },
      });
    } else {
      // Mantém o "sem resposta" contando a partir do último envio.
      await tx.order.update({ where: { id: orderId }, data: { updatedAt: new Date() } });
    }
  });

  return { order: await getOrder(orderId), totais: totals };
}

// ─── Pagamentos ──────────────────────────────────────────────

export async function addPayment(id: unknown, input: Record<string, any>, actor: Actor) {
  const orderId = requireInt(id, "id");
  await loadOrder(orderId);
  const kind = PAYMENT_KINDS.includes(input.kind) ? input.kind : "outro";
  const amountCents = requireInt(input.amountCents, "Valor");
  if (amountCents === 0) throw new RuleError("valor_invalido", "Informe um valor maior que zero.", 400);
  const payment = await prisma.payment.create({
    data: {
      orderId,
      kind,
      amountCents,
      dueDate: input.dueDate ? toDbDate(requireDate(input.dueDate, "o vencimento")) : null,
      method: str(input.method, 40) || "pix",
    },
  });
  if (input.status === "recebido") return updatePayment(payment.id, { status: "recebido" }, actor);
  return { ...(await getOrder(orderId)), aviso: null as string | null };
}

export async function updatePayment(id: unknown, input: Record<string, any>, actor: Actor) {
  const paymentId = requireInt(id, "id");
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new RuleError("pagamento_nao_encontrado", "Pagamento não encontrado.", 404);

  const data: Prisma.PaymentUpdateInput = {};
  if (input.status !== undefined) {
    if (!PAYMENT_STATUSES.includes(input.status)) throw new RuleError("status_invalido", "Status de pagamento inválido.", 400);
    data.status = input.status;
    data.paidAt = input.status === "recebido" ? (payment.paidAt ?? new Date()) : null;
  }
  if (input.amountCents !== undefined) data.amountCents = requireInt(input.amountCents, "Valor");
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? toDbDate(requireDate(input.dueDate, "o vencimento")) : null;
  if (input.method !== undefined) data.method = str(input.method, 40);
  if (input.externalId !== undefined) data.externalId = str(input.externalId, 200);
  await prisma.payment.update({ where: { id: paymentId }, data });

  // Sinal recebido confirma o pedido e bloqueia a data no site.
  let aviso: string | null = null;
  if (input.status === "recebido" && payment.kind === "sinal") {
    const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
    if (order && (order.status === "reservado" || canTransition(order.status as OrderStatus, "reservado"))) {
      try {
        if (order.status !== "reservado") await changeStatus(order.id, "reservado", actor, "Sinal recebido");
        await changeStatus(order.id, "confirmado", actor, "Sinal recebido");
      } catch (e) {
        if (!(e instanceof RuleError)) throw e;
        aviso = `Pagamento registrado, mas o pedido não foi confirmado: ${e.message}`;
      }
    }
  }
  return { ...(await getOrder(payment.orderId)), aviso };
}

// ─── Painel ──────────────────────────────────────────────────

export async function getAlerts(now = new Date()) {
  const [settings, openOrders, reservations, payments, facts] = await Promise.all([
    getSettings(),
    prisma.order.findMany({
      where: { status: { notIn: ["realizado", "perdido", "cancelado"] } },
      include: { client: { select: { name: true } } },
    }),
    prisma.reservation.findMany({ where: { activeDate: { not: null } } }),
    prisma.payment.findMany({ where: { status: { in: ["a_receber", "atrasado"] } } }),
    getCalendarFacts(),
  ]);
  // Pagamento em aberto de pedido já realizado (saldo que ficou para trás) também precisa do nome do casal
  // no alerta; senão aparece "Pedido #8". Esses pedidos não geram nenhum outro alerta (só os abertos geram).
  const known = new Set(openOrders.map((o) => o.id));
  const missing = [...new Set(payments.map((p) => p.orderId))].filter((id) => !known.has(id));
  const closedWithDebt = missing.length
    ? await prisma.order.findMany({ where: { id: { in: missing } }, include: { client: { select: { name: true } } } })
    : [];
  const orders = [...openOrders, ...closedWithDebt];
  return computeAlerts({
    now,
    settings,
    blocked: facts.blocked,
    manualBlocked: facts.manualBlocked,
    googleLinks: facts.googleLinks,
    orders: orders.map((o) => ({
      id: o.id,
      clientName: o.client.name,
      status: o.status as OrderStatus,
      eventDate: dateToISO(o.eventDate),
      updatedAt: o.updatedAt,
      createdAt: o.createdAt,
    })),
    reservations: reservations.map((r) => ({
      orderId: r.orderId,
      date: dateToISO(r.date)!,
      kind: r.kind,
      expiresAt: r.expiresAt,
    })),
    payments: payments.map((p) => ({
      orderId: p.orderId,
      kind: p.kind,
      amountCents: p.amountCents,
      dueDate: dateToISO(p.dueDate),
      status: p.status,
    })),
  });
}

export async function getDashboard(now = new Date()) {
  const today = todayISO(now);
  const [orders, quotes, payments, alerts, settings] = await Promise.all([
    prisma.order.findMany({ include: orderInclude, orderBy: [{ eventDate: "asc" }, { id: "desc" }] }),
    prisma.quote.findMany({ select: { sentAt: true, createdAt: true } }),
    prisma.payment.findMany({ select: { status: true, amountCents: true, paidAt: true } }),
    getAlerts(now),
    getSettings(),
  ]);
  const views = orders.map(serializeOrder);
  const kpis = computeKpis({
    today,
    orders: orders.map((o) => ({ status: o.status as OrderStatus, createdAt: o.createdAt })),
    quotes,
    payments,
  });
  const upcoming = views
    .filter((o) => o.eventDate && o.eventDate >= today && ["reservado", "confirmado"].includes(o.status))
    .slice(0, 12);
  const funnel = views.filter((o) => isOrderStatus(o.status) && isOpenStatus(o.status));
  return { hoje: today, kpis, alerts, upcoming, funnel, settings };
}

// ─── Rotina diária ───────────────────────────────────────────

export async function runDailyRoutine(now = new Date()) {
  const today = todayISO(now);
  const expired = await prisma.reservation.findMany({
    where: { activeDate: { not: null }, kind: "provisoria", expiresAt: { lt: now } },
  });
  const released: number[] = [];
  for (const r of expired) {
    const order = await prisma.order.findUnique({ where: { id: r.orderId } });
    if (order?.status === "reservado") {
      await changeStatus(order.id, "aguardando_resposta", "sistema", "Reserva provisória expirou sem sinal");
    } else {
      await prisma.$transaction((tx) => releaseInTx(r.orderId, tx));
      await syncOrderCalendar(r.orderId);
    }
    released.push(r.orderId);
  }
  const overdue = await prisma.payment.updateMany({
    where: { status: "a_receber", dueDate: { lt: toDbDate(today) } },
    data: { status: "atrasado" },
  });
  return { hoje: today, reservasExpiradas: released, pagamentosAtrasados: overdue.count };
}
