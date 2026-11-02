// Lista de pedidos do painel: filtros, busca, ordem e resumo de pagamento. Regra pura, testada em pedidos.test.ts.

import { diffDays } from "../gestor/rules.ts";

export interface OrderLite {
  id: number;
  status: string;
  eventDate: string | null;
  eventTime: string;
  venue: string;
  city: string;
  client: { name: string; phone: string };
  quotes: { totalCents: number }[];
  payments: { kind: string; amountCents: number; status: string; dueDate: string | null }[];
}

export type OrderFilterKey = "andamento" | "confirmados" | "realizados" | "encerrados" | "todos";

export const ORDER_FILTERS: { key: OrderFilterKey; label: string; statuses: readonly string[] | null }[] = [
  { key: "andamento", label: "Em andamento", statuses: ["novo", "orcamento_enviado", "aguardando_resposta", "reservado"] },
  { key: "confirmados", label: "Confirmados", statuses: ["confirmado"] },
  { key: "realizados", label: "Realizados", statuses: ["realizado"] },
  { key: "encerrados", label: "Perdidos e cancelados", statuses: ["perdido", "cancelado"] },
  { key: "todos", label: "Todos", statuses: null },
];

/** Minúsculas e sem acento, para a busca achar "Mônica" digitando "monica". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Acha por nome, telefone, local, cidade ou número do pedido ("12" ou "#12"). Busca vazia acha tudo. */
export function matchesQuery(o: OrderLite, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const idQuery = /^#?\d+$/.test(q) ? Number(q.replace("#", "")) : null;
  if (idQuery !== null && o.id === idQuery) return true;
  if (normalize(o.client.name).includes(q)) return true;
  if (digits.length >= 3 && o.client.phone.replace(/\D/g, "").includes(digits)) return true;
  return normalize(`${o.venue} ${o.city}`).includes(q);
}

function byDate(a: OrderLite, b: OrderLite, direction: 1 | -1): number {
  // Pedido sem data de evento vai para o fim em qualquer ordem.
  if (!a.eventDate && !b.eventDate) return b.id - a.id;
  if (!a.eventDate) return 1;
  if (!b.eventDate) return -1;
  return a.eventDate === b.eventDate ? b.id - a.id : a.eventDate < b.eventDate ? -direction : direction;
}

/** Pedidos do filtro e da busca, na ordem que faz sentido: os que vêm aí por data; os que passaram, do mais recente. */
export function filterOrders(orders: OrderLite[], key: OrderFilterKey, query = ""): OrderLite[] {
  const f = ORDER_FILTERS.find((x) => x.key === key) ?? ORDER_FILTERS[0];
  const list = orders.filter((o) => (f.statuses ? f.statuses.includes(o.status) : true) && matchesQuery(o, query));
  if (key === "todos") return list.sort((a, b) => b.id - a.id);
  return list.sort((a, b) => byDate(a, b, key === "andamento" || key === "confirmados" ? 1 : -1));
}

/** Quantos pedidos há em cada filtro (respeitando a busca). */
export function filterCounts(orders: OrderLite[], query = ""): Record<OrderFilterKey, number> {
  const out = {} as Record<OrderFilterKey, number>;
  for (const f of ORDER_FILTERS) out[f.key] = orders.filter((o) => (f.statuses ? f.statuses.includes(o.status) : true) && matchesQuery(o, query)).length;
  return out;
}

export interface PaymentSummary {
  /** Soma do que já foi recebido. */
  receivedCents: number;
  /** Soma de tudo que está combinado (menos o cancelado). */
  totalCents: number;
  /** Próxima parcela em aberto (a mais antiga), se houver. */
  open: { kind: string; amountCents: number; dueDate: string | null; overdue: boolean } | null;
}

export function paymentSummary(o: Pick<OrderLite, "payments">, today: string): PaymentSummary {
  const live = o.payments.filter((p) => p.status !== "cancelado");
  const receivedCents = live.filter((p) => p.status === "recebido").reduce((s, p) => s + p.amountCents, 0);
  const totalCents = live.reduce((s, p) => s + p.amountCents, 0);
  const pending = live
    .filter((p) => p.status === "a_receber" || p.status === "atrasado")
    .sort((a, b) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"));
  const first = pending[0];
  return {
    receivedCents,
    totalCents,
    open: first ? { kind: first.kind, amountCents: first.amountCents, dueDate: first.dueDate, overdue: first.status === "atrasado" || Boolean(first.dueDate && first.dueDate < today) } : null,
  };
}

/** Valor do orçamento mais recente (a lista já vem do mais novo para o mais antigo), ou null. */
export function latestQuoteCents(o: Pick<OrderLite, "quotes">): number | null {
  return o.quotes[0]?.totalCents ?? null;
}

/** "hoje", "amanhã", "em 12 dias", "ontem", "há 30 dias" ou "sem data". */
export function eventWhen(eventDate: string | null, today: string): string {
  if (!eventDate) return "sem data";
  const d = diffDays(today, eventDate);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d === -1) return "ontem";
  return d > 0 ? `em ${d} dias` : `há ${-d} dias`;
}
