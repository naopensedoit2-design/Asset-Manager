// Tela "Hoje": o que precisa do Leonardo agora e as próximas paradas. Regra pura (sem banco), testada em hoje.test.ts.
// A fila junta quatro fontes: aprovações pedidas pela Margot, alertas do negócio, conversas que a Margot não
// resolve sozinha e contas a pagar. Conversa que a Margot está cuidando não entra: o ponto é só mostrar exceções.

import { diffDays, formatBRL, formatDateBR, type Alert } from "../gestor/rules.ts";

export type Tone = "urgente" | "atencao" | "info";
export type QueueKind = "aprovacao" | "sistema" | "alerta" | "conversa" | "conta";

export interface QueueItem {
  id: string;
  kind: QueueKind;
  tone: Tone;
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
  /** Só nas aprovações: id da mensagem da Margot que espera o "sim". */
  approvalId?: number;
}

export interface PendingApproval {
  id: number;
  text: string;
  createdAt: string;
}

export interface WaitingConversation {
  id: number;
  name: string;
  paused: boolean;
  windowOpen: boolean;
  /** Quando a pessoa escreveu a última mensagem que ainda não foi respondida. */
  waitingSince: string | null;
  lastText: string;
}

export interface OpenBill {
  id: number;
  description: string;
  supplier: string;
  amountCents: number;
  dueDate: string | null;
}

export interface QueueInput {
  now: Date;
  /** AAAA-MM-DD no fuso de São Paulo. */
  today: string;
  alerts: Alert[];
  approvals: PendingApproval[];
  conversations: WaitingConversation[];
  bills: OpenBill[];
  margotWhatsappOn: boolean;
  whatsappConfigured: boolean;
}

/** Minutos sem resposta, com a Margot ligada, a partir dos quais vale conferir a conversa. */
export const SLOW_REPLY_MINUTES = 30;
/** Conta que vence nesse prazo (em dias) entra na fila. */
export const BILL_SOON_DAYS = 3;

// ─── Textos de tempo ─────────────────────────────────────────

/** "agora há pouco", "há 35 min", "há 3 h", "há 2 dias". */
export function agoLabel(from: Date | string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(from).getTime()) / 60_000));
  if (minutes < 2) return "agora há pouco";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}

/** "hoje", "amanhã", "em 4 dias", "ontem", "há 3 dias". */
export function daysLabel(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  return days > 0 ? `em ${days} dias` : `há ${-days} dias`;
}

function clip(text: string, max = 90): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

// ─── Aprovações pedidas pela Margot ──────────────────────────

/** O texto vem pronto para o WhatsApp (*negrito*, "Confirma?"). Aqui vira título e detalhe em texto simples. */
export function approvalSummary(text: string): { title: string; detail: string } {
  const lines = text
    .replace(/\*/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^confirma\?/i.test(l));
  return { title: lines[0] ?? "A Margot pede sua confirmação", detail: lines.slice(1).join("\n") };
}

// ─── Fila ────────────────────────────────────────────────────

const TONE_ORDER: Record<Tone, number> = { urgente: 0, atencao: 1, info: 2 };
const KIND_ORDER: Record<QueueKind, number> = { aprovacao: 0, sistema: 1, alerta: 2, conversa: 3, conta: 4 };

const ALERT_ACTION: Record<Alert["type"], string> = {
  data_em_conflito: "Resolver a data",
  reserva_expirando: "Abrir o pedido",
  pagamento_atrasado: "Ver o pagamento",
  pagamento_vencendo: "Ver o pagamento",
  orcamento_sem_resposta: "Fazer o follow-up",
  evento_proximo: "Ver o evento",
  pedido_novo: "Montar o orçamento",
};

/** Por que esta conversa precisa do Leonardo (ou null se a Margot está cuidando dela). */
export function conversationNeed(
  c: WaitingConversation,
  ctx: { now: Date; margotWhatsappOn: boolean },
): { tone: Tone; title: string; detail: string; action: string } | null {
  if (!c.waitingSince) return null;
  const since = agoLabel(c.waitingSince, ctx.now);
  const minutes = (ctx.now.getTime() - new Date(c.waitingSince).getTime()) / 60_000;
  const quote = c.lastText ? `“${clip(c.lastText)}”` : "";
  if (c.paused) {
    return { tone: "atencao", title: `${c.name} escreveu ${since} e espera você`, detail: `Você assumiu esta conversa; a Margot não responde nela. ${quote}`.trim(), action: "Responder" };
  }
  if (!c.windowOpen) {
    return {
      tone: "atencao",
      title: `${c.name} está sem resposta ${since}`,
      detail: `Passaram as 24h do WhatsApp, e a Margot só pode responder dentro desse prazo. Responda pelo seu WhatsApp. ${quote}`.trim(),
      action: "Abrir a conversa",
    };
  }
  if (!ctx.margotWhatsappOn) {
    return { tone: "atencao", title: `${c.name} escreveu ${since} e espera resposta`, detail: `A Margot está pausada no WhatsApp. ${quote}`.trim(), action: "Responder" };
  }
  if (minutes >= SLOW_REPLY_MINUTES) {
    return { tone: "atencao", title: `${c.name} escreveu ${since} e a Margot ainda não respondeu`, detail: `Vale conferir a conversa. ${quote}`.trim(), action: "Abrir a conversa" };
  }
  return null;
}

export function buildQueue(input: QueueInput): QueueItem[] {
  const { now, today, alerts, approvals, conversations, bills } = input;
  const items: QueueItem[] = [];

  for (const a of approvals) {
    const s = approvalSummary(a.text);
    items.push({
      id: `ap:${a.id}`,
      kind: "aprovacao",
      tone: "atencao",
      title: s.title,
      detail: s.detail,
      href: "/admin/conversas",
      actionLabel: "Confirmar",
      approvalId: a.id,
    });
  }

  if (!input.whatsappConfigured) {
    items.push({
      id: "sys:whatsapp",
      kind: "sistema",
      tone: "atencao",
      title: "O WhatsApp da Margot ainda não está conectado",
      detail: "Sem isso, ela não atende clientes nem avisa você. Veja o que falta em Conexões.",
      href: "/admin/conexoes",
      actionLabel: "Ver o que falta",
    });
  }

  for (const al of alerts) {
    // Casamento chegando só aparece aqui quando é questão de dias; o resto fica em "Próximas paradas".
    if (al.type === "evento_proximo" && al.severity === "info") continue;
    items.push({
      id: `al:${al.type}:${al.orderId ?? "x"}:${al.title}`,
      kind: "alerta",
      tone: al.severity,
      title: al.title,
      detail: al.detail,
      href: al.orderId ? `/admin/pedidos/${al.orderId}` : "/admin/pedidos",
      actionLabel: ALERT_ACTION[al.type] ?? "Abrir",
    });
  }

  for (const c of conversations) {
    const need = conversationNeed(c, { now, margotWhatsappOn: input.margotWhatsappOn });
    if (!need) continue;
    items.push({ id: `cv:${c.id}`, kind: "conversa", tone: need.tone, title: need.title, detail: need.detail, href: `/admin/conversas/${c.id}`, actionLabel: need.action });
  }

  for (const b of bills) {
    if (!b.dueDate) continue;
    const days = diffDays(today, b.dueDate);
    if (days > BILL_SOON_DAYS) continue;
    const who = b.supplier ? ` · ${b.supplier}` : "";
    if (days < 0) {
      items.push({
        id: `ct:${b.id}`,
        kind: "conta",
        tone: "urgente",
        title: `Conta vencida: ${b.description}`,
        detail: `${formatBRL(b.amountCents)}${who} · venceu ${daysLabel(days)} (${formatDateBR(b.dueDate)}).`,
        href: "/admin/financeiro?aba=contas",
        actionLabel: "Ver a conta",
      });
    } else {
      items.push({
        id: `ct:${b.id}`,
        kind: "conta",
        tone: "atencao",
        title: `Conta vence ${daysLabel(days)}: ${b.description}`,
        detail: `${formatBRL(b.amountCents)}${who} · até ${formatDateBR(b.dueDate)}.`,
        href: "/admin/financeiro?aba=contas",
        actionLabel: "Ver a conta",
      });
    }
  }

  // Pedidos de confirmação da Margot vêm primeiro: resolvem com um toque e muitas vezes destravam o resto da fila.
  const approvalFirst = (k: QueueKind) => (k === "aprovacao" ? 0 : 1);
  return items
    .map((it, i) => ({ it, i }))
    .sort(
      (a, b) =>
        approvalFirst(a.it.kind) - approvalFirst(b.it.kind) ||
        TONE_ORDER[a.it.tone] - TONE_ORDER[b.it.tone] ||
        KIND_ORDER[a.it.kind] - KIND_ORDER[b.it.kind] ||
        a.i - b.i,
    )
    .map(({ it }) => it);
}

export function queueCounts(queue: QueueItem[]) {
  return {
    total: queue.length,
    urgente: queue.filter((q) => q.tone === "urgente").length,
    aprovacoes: queue.filter((q) => q.kind === "aprovacao").length,
  };
}

// ─── Próximas paradas (casamentos que vêm aí) ────────────────

export interface StopInput {
  id: number;
  status: string;
  statusLabel: string;
  eventDate: string | null;
  eventTime: string;
  city: string;
  venue: string;
  client: { name: string };
  payments: { status: string }[];
}

export interface Stop {
  orderId: number;
  client: string;
  status: string;
  statusLabel: string;
  eventDate: string;
  eventTime: string;
  place: string;
  days: number;
  when: string;
  pendingPayment: boolean;
}

export function buildStops(orders: StopInput[], today: string, limit = 5): Stop[] {
  const stops: Stop[] = [];
  for (const o of orders) {
    if (!o.eventDate) continue;
    const days = diffDays(today, o.eventDate);
    if (days < 0) continue;
    stops.push({
      orderId: o.id,
      client: o.client.name,
      status: o.status,
      statusLabel: o.statusLabel,
      eventDate: o.eventDate,
      eventTime: o.eventTime,
      place: [o.venue, o.city].filter(Boolean).join(", "),
      days,
      when: daysLabel(days),
      pendingPayment: o.payments.some((p) => p.status === "a_receber" || p.status === "atrasado"),
    });
  }
  return stops.sort((a, b) => a.days - b.days || a.orderId - b.orderId).slice(0, limit);
}

// ─── Formato que a API devolve ───────────────────────────────

export interface HojeData {
  hoje: string;
  agora: string;
  margot: {
    whatsappLigado: boolean;
    siteLigado: boolean;
    whatsappConfigurado: boolean;
    /** Chave da IA presente e dentro do limite do mês. */
    iaPronta: boolean;
    respostas24h: number;
    conversasEmAndamento: number;
    usoUsd: number;
    limiteUsd: number;
  };
  fila: QueueItem[];
  aprovacoes: number;
  conversasEsperando: number;
  dinheiro: {
    recebidoMesCents: number;
    aReceberCents: number;
    atrasadoCents: number;
    aPagarCents: number;
    aPagarVencidoCents: number;
  };
  paradas: Stop[];
  rotina: { ultimaExecucao: string | null; resumoEnviado: boolean | null; detalhe: string | null };
}
