// O que a Margot faz no sistema, igual no site e no WhatsApp: conferir data, registrar pedido,
// anotar recados para o Leonardo. Tudo passa por src/lib/gestor/service.ts (mesmas regras do painel).

import { prisma } from "@/lib/prisma";
import * as gestor from "@/lib/gestor/service";
import { formatBRL, formatDateBR, normalizePhone, RuleError } from "@/lib/gestor/rules";
import { dateFacts } from "./clock";

const EDITABLE = ["novo", "orcamento_enviado", "aguardando_resposta"];

export async function checkDate(date: unknown) {
  const r = await gestor.checkAvailability(date);
  // Dia da semana e dias que faltam vêm do código: o modelo não calcula calendário de cabeça.
  const facts = dateFacts(r.data) ?? {};
  if (r.passado) return { data: r.data, status: "passou", mensagem: "Essa data já passou.", ...facts };
  return { data: r.data, status: r.status, ...facts };
}

/** Reaproveita o pedido desta conversa, ou um pedido recente em aberto do mesmo WhatsApp. */
export async function findOrderToUpdate(orderId: number | null, phones: string[], recentDays = 3): Promise<number | null> {
  if (orderId) {
    const o = await prisma.order.findUnique({ where: { id: orderId }, include: { client: true } });
    if (o && EDITABLE.includes(o.status) && phones.includes(o.client.phone)) return o.id;
  }
  const recent = await prisma.order.findFirst({
    where: {
      client: { phone: { in: phones } },
      status: { in: EDITABLE },
      createdAt: { gte: new Date(Date.now() - recentDays * 86_400_000) },
    },
    orderBy: { createdAt: "desc" },
  });
  return recent?.id ?? null;
}

export interface OrderRequest {
  nome?: string;
  data?: string;
  horario?: string;
  local?: string;
  cidade?: string;
  servicos?: unknown;
  origem?: string;
  quem_indicou?: string;
  resumo?: string;
}

/**
 * Cria ou atualiza o pedido e registra o orçamento com os preços atuais.
 * phone: número já normalizado (o do WhatsApp da conversa, ou o informado no site).
 */
export async function registerOrder(opts: {
  input: OrderRequest;
  phone: string;
  phoneVariants: string[];
  currentOrderId: number | null;
  channelNote: string;
  recentDays?: number;
  defaultSource?: string;
}) {
  const { input } = opts;
  const availability = await gestor.checkAvailability(input?.data);
  if (availability.passado) return { erro: "Essa data já passou." };
  const existingId = await findOrderToUpdate(opts.currentOrderId, opts.phoneVariants, opts.recentDays);
  const ownDate =
    existingId !== null &&
    (await prisma.order.findUnique({ where: { id: existingId }, select: { eventDate: true } }))?.eventDate
      ?.toISOString()
      .slice(0, 10) === availability.data;
  if (!availability.livre && !ownDate) return { erro: "Essa data não está disponível." };

  // Mantém o telefone já cadastrado (pode estar na forma sem o nono dígito).
  const known = await prisma.client.findFirst({ where: { phone: { in: opts.phoneVariants } }, select: { phone: true } });
  const phone = known?.phone ?? opts.phone;

  const notes = `${opts.channelNote}${input?.resumo ? `\n${String(input.resumo).slice(0, 1500)}` : ""}`;
  const payload = {
    client: {
      name: input?.nome,
      phone,
      source: input?.origem ?? opts.defaultSource ?? "site",
      referredBy: input?.quem_indicou ?? "",
    },
    eventDate: availability.data,
    eventTime: input?.horario ?? "",
    venue: input?.local ?? "",
    city: input?.cidade ?? "",
    serviceIds: Array.isArray(input?.servicos) ? (input.servicos as unknown[]) : [],
    notes,
  };

  let orderId: number;
  let created = false;
  if (existingId) {
    await gestor.updateOrder(existingId, payload, "margot");
    orderId = existingId;
  } else {
    orderId = (await gestor.createOrder(payload, "margot")).order.id;
    created = true;
  }
  const { totais, order } = await gestor.createQuote(orderId, { serviceIds: payload.serviceIds }, "margot");
  const items = order.quotes[0]?.items ?? [];
  return {
    orderId,
    created,
    order,
    resultado: {
      pedido: orderId,
      data: formatDateBR(availability.data),
      servicos: items.map((i) => `${i.name} (${formatBRL(i.priceCents)})`),
      total: formatBRL(totais.totalCents),
      sinal: formatBRL(totais.depositCents),
      saldo: formatBRL(totais.balanceCents),
    },
  };
}

/** Acrescenta um recado da Margot nas observações do pedido (o Leonardo lê no painel). */
export async function appendOrderNote(orderId: number | null, note: string) {
  if (!orderId) return;
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { notes: true } });
  if (!order) return;
  await prisma.order.update({
    where: { id: orderId },
    data: { notes: `${order.notes}\n${note}`.trim().slice(0, 5000) },
  });
}

export function toolError(e: unknown, tool: string) {
  if (e instanceof RuleError) return { erro: e.message };
  console.error(`[margot] ferramenta ${tool}`, e);
  return { erro: "Falha interna ao consultar o sistema. Encaminhe para o Leonardo." };
}

export { normalizePhone };
