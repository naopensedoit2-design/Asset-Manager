// Regras de negócio puras do módulo de gestão.
// Sem acesso a banco ou rede: tudo aqui é testado em rules.test.ts.
// Datas de evento circulam como strings "AAAA-MM-DD"; dinheiro em centavos.

export const TIMEZONE = "America/Sao_Paulo";

// ─── Status do pedido ────────────────────────────────────────

export const ORDER_STATUSES = [
  "novo",
  "orcamento_enviado",
  "aguardando_resposta",
  "reservado",
  "confirmado",
  "realizado",
  "perdido",
  "cancelado",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  novo: "Novo pedido",
  orcamento_enviado: "Orçamento enviado",
  aguardando_resposta: "Aguardando resposta",
  reservado: "Data reservada",
  confirmado: "Confirmado",
  realizado: "Realizado",
  perdido: "Perdido",
  cancelado: "Cancelado",
};

/** Colunas do funil, na ordem em que aparecem no painel. */
export const FUNNEL_COLUMNS: OrderStatus[] = [
  "novo",
  "orcamento_enviado",
  "aguardando_resposta",
  "reservado",
  "confirmado",
];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  novo: ["orcamento_enviado", "aguardando_resposta", "reservado", "perdido", "cancelado"],
  orcamento_enviado: ["aguardando_resposta", "reservado", "novo", "perdido", "cancelado"],
  aguardando_resposta: ["orcamento_enviado", "reservado", "perdido", "cancelado"],
  reservado: ["confirmado", "aguardando_resposta", "perdido", "cancelado"],
  confirmado: ["realizado", "cancelado"],
  realizado: [],
  perdido: ["novo"],
  cancelado: ["novo"],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return allowedTransitions(from).includes(to);
}

/** Status em que o pedido ainda ocupa ou pode ocupar a data. */
export function isOpenStatus(status: OrderStatus): boolean {
  return !["realizado", "perdido", "cancelado"].includes(status);
}

// ─── Configurações ───────────────────────────────────────────

export interface Settings {
  depositPercent: number;
  balanceDaysBefore: number;
  provisionalHours: number;
  followUpDays: number;
  cancellationPolicy: string;
  serviceArea: string;
}

export const DEFAULT_SETTINGS: Settings = {
  depositPercent: 50,
  balanceDaysBefore: 7,
  provisionalHours: 48,
  followUpDays: 3,
  cancellationPolicy: "",
  serviceArea: "",
};

export const SETTING_LABELS: Record<keyof Settings, string> = {
  depositPercent: "Sinal para reservar (%)",
  balanceDaysBefore: "Saldo vence quantos dias antes do evento",
  provisionalHours: "Reserva sem sinal expira em (horas)",
  followUpDays: "Lembrar orçamento sem resposta após (dias)",
  cancellationPolicy: "Política de cancelamento",
  serviceArea: "Raio de atendimento e taxa de deslocamento",
};

const NUMERIC_SETTINGS: (keyof Settings)[] = [
  "depositPercent",
  "balanceDaysBefore",
  "provisionalHours",
  "followUpDays",
];

export function isSettingKey(key: string): key is keyof Settings {
  return key in DEFAULT_SETTINGS;
}

/** Junta as linhas salvas no banco com os padrões. Valores inválidos voltam ao padrão. */
export function parseSettings(rows: { key: string; value: string }[]): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (!isSettingKey(row.key)) continue;
    if (NUMERIC_SETTINGS.includes(row.key)) {
      const n = Number(row.value);
      if (Number.isFinite(n) && n >= 0) (out as any)[row.key] = n;
    } else {
      (out as any)[row.key] = row.value;
    }
  }
  return out;
}

/** Valida um valor antes de salvar. Retorna o valor normalizado ou uma mensagem de erro. */
export function validateSetting(
  key: keyof Settings,
  raw: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (NUMERIC_SETTINGS.includes(key)) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return { ok: false, error: `${SETTING_LABELS[key]}: use um número inteiro maior ou igual a zero.` };
    }
    if (key === "depositPercent" && n > 100) {
      return { ok: false, error: "O sinal não pode passar de 100%." };
    }
    return { ok: true, value: String(n) };
  }
  return { ok: true, value: String(raw ?? "").trim() };
}

// ─── Serviços ────────────────────────────────────────────────

export const DEFAULT_SERVICES = [
  {
    name: "Carro da Noiva",
    description: "Chegada da noiva no MP Lafer conversível.",
    priceCents: 260000,
    isAddon: false,
    sortOrder: 1,
  },
  {
    name: "Saída dos Noivos",
    description:
      "O carro permanece após a chegada da noiva para um segundo deslocamento no mesmo local.",
    priceCents: 50000,
    isAddon: true,
    sortOrder: 2,
  },
];

// ─── Dinheiro ────────────────────────────────────────────────

export interface QuoteItem {
  serviceId: number | null;
  name: string;
  priceCents: number;
}

export interface QuoteTotals {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
}

export function calcQuote(items: QuoteItem[], discountCents: number, depositPercent: number): QuoteTotals {
  if (items.length === 0) throw new RuleError("orcamento_vazio", "Inclua pelo menos um serviço no orçamento.");
  for (const item of items) {
    if (!Number.isInteger(item.priceCents) || item.priceCents < 0) {
      throw new RuleError("valor_invalido", `Valor inválido para "${item.name}".`);
    }
  }
  if (!Number.isInteger(discountCents) || discountCents < 0) {
    throw new RuleError("desconto_invalido", "O desconto precisa ser um valor positivo.");
  }
  const subtotalCents = items.reduce((sum, i) => sum + i.priceCents, 0);
  if (discountCents > subtotalCents) {
    throw new RuleError("desconto_invalido", "O desconto não pode ser maior que o valor dos serviços.");
  }
  const totalCents = subtotalCents - discountCents;
  const depositCents = Math.round((totalCents * depositPercent) / 100);
  return { subtotalCents, discountCents, totalCents, depositCents, balanceCents: totalCents - depositCents };
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Converte "2.600,00", "2600" ou 2600 em centavos. */
export function parseBRLToCents(input: string | number): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) : null;
  const cleaned = input.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

// ─── Datas ───────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Dias de "from" até "to" (positivo se "to" é depois). */
export function diffDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function formatDateBR(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** Converte um Date vindo de coluna DATE do Postgres para "AAAA-MM-DD". */
export function dateToISO(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** Vencimento do saldo: N dias antes do evento, mas nunca antes de hoje. */
export function balanceDueDate(eventDate: string, daysBefore: number, today: string): string {
  const due = addDays(eventDate, -daysBefore);
  return due < today ? today : due;
}

// ─── Disponibilidade ─────────────────────────────────────────

export type DayAvailability = "livre" | "provisoria" | "ocupada";

export interface CalendarFacts {
  /** Datas bloqueadas manualmente no calendário do site. */
  blocked: string[];
  /** Reservas ativas (provisórias ou confirmadas). */
  reservations: { date: string; kind: string; orderId: number }[];
}

export function availabilityOf(
  date: string,
  facts: CalendarFacts,
  ignoreOrderId?: number,
): { status: DayAvailability; orderId: number | null } {
  const reservation = facts.reservations.find((r) => r.date === date && r.orderId !== ignoreOrderId);
  if (reservation) {
    return {
      status: reservation.kind === "confirmada" ? "ocupada" : "provisoria",
      orderId: reservation.orderId,
    };
  }
  const ownReservation = facts.reservations.find((r) => r.date === date && r.orderId === ignoreOrderId);
  if (facts.blocked.includes(date) && !ownReservation) return { status: "ocupada", orderId: null };
  return { status: "livre", orderId: null };
}

// ─── Telefone ────────────────────────────────────────────────

/** Mantém só dígitos e adiciona o DDI 55 em números brasileiros sem DDI. */
export function normalizePhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

// ─── Alertas ─────────────────────────────────────────────────

export type AlertSeverity = "urgente" | "atencao" | "info";

export interface Alert {
  type:
    | "data_em_conflito"
    | "reserva_expirando"
    | "pagamento_atrasado"
    | "pagamento_vencendo"
    | "orcamento_sem_resposta"
    | "evento_proximo"
    | "pedido_novo";
  severity: AlertSeverity;
  title: string;
  detail: string;
  orderId: number | null;
}

export interface AlertInput {
  now: Date;
  settings: Settings;
  orders: {
    id: number;
    clientName: string;
    status: OrderStatus;
    eventDate: string | null;
    updatedAt: Date;
    createdAt: Date;
  }[];
  reservations: { orderId: number; date: string; kind: string; expiresAt: Date | null }[];
  payments: {
    orderId: number;
    kind: string;
    amountCents: number;
    dueDate: string | null;
    status: string;
  }[];
  blocked: string[];
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { urgente: 0, atencao: 1, info: 2 };

export function computeAlerts(input: AlertInput): Alert[] {
  const { now, settings, orders, reservations, payments, blocked } = input;
  const today = todayISO(now);
  const byId = new Map(orders.map((o) => [o.id, o]));
  const alerts: Alert[] = [];
  const name = (orderId: number) => byId.get(orderId)?.clientName ?? `Pedido #${orderId}`;

  // Pedido aberto pedindo uma data já ocupada por outro pedido ou bloqueio.
  for (const order of orders) {
    if (!order.eventDate || !["novo", "orcamento_enviado", "aguardando_resposta"].includes(order.status)) continue;
    const taken = availabilityOf(order.eventDate, { blocked, reservations }, order.id);
    if (taken.status !== "livre") {
      alerts.push({
        type: "data_em_conflito",
        severity: "urgente",
        title: `${order.clientName} pediu uma data ocupada`,
        detail: `${formatDateBR(order.eventDate)} já está ${taken.status === "provisoria" ? "em reserva provisória" : "reservada"}.`,
        orderId: order.id,
      });
    }
  }

  // Reserva provisória perto de expirar (próximas 12h).
  for (const r of reservations) {
    if (r.kind !== "provisoria" || !r.expiresAt) continue;
    const hoursLeft = (r.expiresAt.getTime() - now.getTime()) / 3_600_000;
    if (hoursLeft <= 12) {
      alerts.push({
        type: "reserva_expirando",
        severity: "urgente",
        title: `Reserva de ${name(r.orderId)} ${hoursLeft <= 0 ? "expirou" : "expira em breve"}`,
        detail:
          hoursLeft <= 0
            ? `A data ${formatDateBR(r.date)} será liberada na próxima rotina se o sinal não for pago.`
            : `Faltam ${Math.max(1, Math.round(hoursLeft))}h para liberar ${formatDateBR(r.date)} sem o sinal.`,
        orderId: r.orderId,
      });
    }
  }

  // Pagamentos atrasados ou vencendo em até 3 dias.
  for (const p of payments) {
    if (!p.dueDate || p.status === "recebido" || p.status === "cancelado") continue;
    const days = diffDays(today, p.dueDate);
    const label = p.kind === "sinal" ? "Sinal" : p.kind === "saldo" ? "Saldo" : "Pagamento";
    if (days < 0 || p.status === "atrasado") {
      alerts.push({
        type: "pagamento_atrasado",
        severity: "urgente",
        title: `${label} de ${name(p.orderId)} atrasado`,
        detail: `${formatBRL(p.amountCents)} venceu em ${formatDateBR(p.dueDate)}.`,
        orderId: p.orderId,
      });
    } else if (days <= 3) {
      alerts.push({
        type: "pagamento_vencendo",
        severity: "atencao",
        title: `${label} de ${name(p.orderId)} vence ${days === 0 ? "hoje" : `em ${days} dia${days > 1 ? "s" : ""}`}`,
        detail: `${formatBRL(p.amountCents)} até ${formatDateBR(p.dueDate)}.`,
        orderId: p.orderId,
      });
    }
  }

  for (const order of orders) {
    // Orçamento sem resposta.
    if (order.status === "orcamento_enviado" || order.status === "aguardando_resposta") {
      const idleDays = Math.floor((now.getTime() - order.updatedAt.getTime()) / 86_400_000);
      if (idleDays >= settings.followUpDays) {
        alerts.push({
          type: "orcamento_sem_resposta",
          severity: "atencao",
          title: `${order.clientName} está sem resposta há ${idleDays} dias`,
          detail: "Hora de um follow-up gentil.",
          orderId: order.id,
        });
      }
    }
    // Pedido novo sem atendimento há mais de 1 dia.
    if (order.status === "novo") {
      const idleHours = (now.getTime() - order.createdAt.getTime()) / 3_600_000;
      if (idleHours >= 24) {
        alerts.push({
          type: "pedido_novo",
          severity: "atencao",
          title: `Pedido de ${order.clientName} ainda sem orçamento`,
          detail: `Chegou há ${Math.floor(idleHours / 24)} dia(s).`,
          orderId: order.id,
        });
      }
    }
    // Evento confirmado nos próximos 14 dias.
    if ((order.status === "confirmado" || order.status === "reservado") && order.eventDate) {
      const days = diffDays(today, order.eventDate);
      if (days >= 0 && days <= 14) {
        alerts.push({
          type: "evento_proximo",
          severity: days <= 2 ? "atencao" : "info",
          title: `Casamento de ${order.clientName} ${days === 0 ? "é hoje" : days === 1 ? "é amanhã" : `em ${days} dias`}`,
          detail: formatDateBR(order.eventDate),
          orderId: order.id,
        });
      }
    }
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

// ─── Indicadores ─────────────────────────────────────────────

export interface KpiInput {
  today: string;
  orders: { status: OrderStatus; createdAt: Date }[];
  quotes: { sentAt: Date | null; createdAt: Date }[];
  payments: { status: string; amountCents: number; paidAt: Date | null }[];
}

export interface Kpis {
  pedidosMes: number;
  orcamentosMes: number;
  aguardando: number;
  fechados: number;
  conversao: number | null;
  recebidoMesCents: number;
  aReceberCents: number;
  atrasadoCents: number;
}

export function computeKpis(input: KpiInput): Kpis {
  const month = input.today.slice(0, 7);
  const inMonth = (d: Date | null) => (d ? todayISO(d).slice(0, 7) === month : false);

  const won = input.orders.filter((o) => ["reservado", "confirmado", "realizado"].includes(o.status)).length;
  const lost = input.orders.filter((o) => o.status === "perdido").length;

  return {
    pedidosMes: input.orders.filter((o) => inMonth(o.createdAt)).length,
    orcamentosMes: input.quotes.filter((q) => inMonth(q.sentAt ?? q.createdAt)).length,
    aguardando: input.orders.filter((o) => o.status === "orcamento_enviado" || o.status === "aguardando_resposta").length,
    fechados: input.orders.filter((o) => o.status === "confirmado" || o.status === "realizado").length,
    conversao: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null,
    recebidoMesCents: input.payments
      .filter((p) => p.status === "recebido" && inMonth(p.paidAt))
      .reduce((s, p) => s + p.amountCents, 0),
    aReceberCents: input.payments
      .filter((p) => p.status === "a_receber" || p.status === "atrasado")
      .reduce((s, p) => s + p.amountCents, 0),
    atrasadoCents: input.payments.filter((p) => p.status === "atrasado").reduce((s, p) => s + p.amountCents, 0),
  };
}

// ─── Erros ───────────────────────────────────────────────────

/** Erro de regra de negócio, com código estável para a API e mensagem para pessoas. */
export class RuleError extends Error {
  code: string;
  httpStatus: number;
  constructor(code: string, message: string, httpStatus = 422) {
    super(message);
    this.name = "RuleError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
