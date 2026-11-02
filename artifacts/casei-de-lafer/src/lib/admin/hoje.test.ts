import { test } from "node:test";
import assert from "node:assert/strict";
import type { Alert } from "../gestor/rules.ts";
import { agoLabel, approvalSummary, buildQueue, buildStops, conversationNeed, daysLabel, queueCounts, type QueueInput, type WaitingConversation } from "./hoje.ts";

const now = new Date("2026-10-30T10:00:00Z"); // 07:00 em São Paulo
const today = "2026-10-30";
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

const base: QueueInput = { now, today, alerts: [], approvals: [], conversations: [], bills: [], margotWhatsappOn: true, whatsappConfigured: true };
const conv = (over: Partial<WaitingConversation> = {}): WaitingConversation => ({
  id: 1,
  name: "Camila & Rafael",
  paused: false,
  windowOpen: true,
  waitingSince: minutesAgo(5),
  lastText: "Vocês esperam para as fotos?",
  ...over,
});
const alert = (over: Partial<Alert>): Alert => ({ type: "pagamento_vencendo", severity: "atencao", title: "Sinal vence amanhã", detail: "R$ 1.040,00", orderId: 4, ...over });

// ─── textos de tempo ─────────────────────────────────────────

test("agoLabel: da hora que passou", () => {
  assert.equal(agoLabel(minutesAgo(0), now), "agora há pouco");
  assert.equal(agoLabel(minutesAgo(1), now), "agora há pouco");
  assert.equal(agoLabel(minutesAgo(35), now), "há 35 min");
  assert.equal(agoLabel(minutesAgo(60), now), "há 1 h");
  assert.equal(agoLabel(minutesAgo(5 * 60 + 40), now), "há 5 h");
  assert.equal(agoLabel(minutesAgo(24 * 60), now), "há 1 dia");
  assert.equal(agoLabel(minutesAgo(3 * 24 * 60 + 5), now), "há 3 dias");
  assert.equal(agoLabel(new Date(now.getTime() + 60_000), now), "agora há pouco"); // relógio adiantado não vira número negativo
});

test("daysLabel", () => {
  assert.equal(daysLabel(0), "hoje");
  assert.equal(daysLabel(1), "amanhã");
  assert.equal(daysLabel(4), "em 4 dias");
  assert.equal(daysLabel(-1), "ontem");
  assert.equal(daysLabel(-3), "há 3 dias");
});

// ─── aprovações ──────────────────────────────────────────────

test("approvalSummary: tira o *negrito*, o pedido de confirmação e separa título de detalhe", () => {
  const s = approvalSummary("Lançar despesa: *Cera e polimento*\nValor: R$ 120,00\nData: hoje · já paga\n\nConfirma? (toque no botão ou responda *sim*)");
  assert.equal(s.title, "Lançar despesa: Cera e polimento");
  assert.equal(s.detail, "Valor: R$ 120,00\nData: hoje · já paga");
});

test("approvalSummary: texto de uma linha só e texto vazio", () => {
  assert.deepEqual(approvalSummary("Entrou um Pix de R$ 1.040,00. Marcar o *sinal* como recebido?\n\nConfirma?"), {
    title: "Entrou um Pix de R$ 1.040,00. Marcar o sinal como recebido?",
    detail: "",
  });
  assert.equal(approvalSummary("").title, "A Margot pede sua confirmação");
});

// ─── conversas ───────────────────────────────────────────────

test("conversa que a Margot está cuidando (ligada, janela aberta, resposta recente) não entra", () => {
  assert.equal(conversationNeed(conv(), { now, margotWhatsappOn: true }), null);
  assert.equal(conversationNeed(conv({ waitingSince: null }), { now, margotWhatsappOn: true }), null);
});

test("conversa assumida pelo Leonardo espera ele, mesmo recém-chegada", () => {
  const n = conversationNeed(conv({ paused: true }), { now, margotWhatsappOn: true })!;
  assert.equal(n.tone, "atencao");
  assert.match(n.title, /escreveu há 5 min e espera você/);
  assert.equal(n.action, "Responder");
});

test("janela de 24h fechada: a Margot não pode responder", () => {
  const n = conversationNeed(conv({ windowOpen: false, waitingSince: minutesAgo(30 * 60) }), { now, margotWhatsappOn: true })!;
  assert.match(n.title, /sem resposta há 1 dia/);
  assert.match(n.detail, /24h do WhatsApp/);
});

test("Margot pausada: toda conversa esperando vira exceção", () => {
  const n = conversationNeed(conv(), { now, margotWhatsappOn: false })!;
  assert.match(n.detail, /pausada no WhatsApp/);
});

test("Margot ligada mas calada há 30 min ou mais: vale conferir", () => {
  assert.equal(conversationNeed(conv({ waitingSince: minutesAgo(29) }), { now, margotWhatsappOn: true }), null);
  const n = conversationNeed(conv({ waitingSince: minutesAgo(35) }), { now, margotWhatsappOn: true })!;
  assert.match(n.title, /há 35 min e a Margot ainda não respondeu/);
});

// ─── fila ────────────────────────────────────────────────────

test("fila vazia quando está tudo em dia", () => {
  assert.deepEqual(buildQueue(base), []);
});

test("ordem: aprovações da Margot primeiro (um toque resolve); depois urgente antes de atenção e, no mesmo nível, alerta, conversa e conta", () => {
  const q = buildQueue({
    ...base,
    approvals: [{ id: 9, text: "Lançar despesa: *Cera*\nConfirma?", createdAt: minutesAgo(10) }],
    alerts: [alert({ severity: "urgente", type: "pagamento_atrasado", title: "Saldo de Vanessa atrasado", orderId: 8 }), alert({})],
    conversations: [conv({ paused: true })],
    bills: [{ id: 3, description: "Pneus", supplier: "", amountCents: 120_000, dueDate: "2026-10-27" }],
  });
  assert.deepEqual(
    q.map((i) => `${i.tone}:${i.kind}`),
    ["atencao:aprovacao", "urgente:alerta", "urgente:conta", "atencao:alerta", "atencao:conversa"],
  );
  assert.deepEqual(queueCounts(q), { total: 5, urgente: 2, aprovacoes: 1 });
});

test("alertas: casamento chegando (informativo) fica só em Próximas paradas; a dois dias, entra", () => {
  const q = buildQueue({
    ...base,
    alerts: [
      alert({ type: "evento_proximo", severity: "info", title: "Casamento em 9 dias", orderId: 5 }),
      alert({ type: "evento_proximo", severity: "atencao", title: "Casamento amanhã", orderId: 6 }),
    ],
  });
  assert.deepEqual(q.map((i) => i.title), ["Casamento amanhã"]);
});

test("alertas apontam para o pedido e dizem o que fazer", () => {
  const [i] = buildQueue({ ...base, alerts: [alert({ type: "reserva_expirando", severity: "urgente", orderId: 4 })] });
  assert.equal(i.href, "/admin/pedidos/4");
  assert.equal(i.actionLabel, "Abrir o pedido");
  const [j] = buildQueue({ ...base, alerts: [alert({ orderId: null })] });
  assert.equal(j.href, "/admin/pedidos");
});

test("aprovação carrega o id para confirmar ou cancelar ali mesmo", () => {
  const [i] = buildQueue({ ...base, approvals: [{ id: 42, text: "Marcar o sinal como recebido?\nConfirma?", createdAt: minutesAgo(3) }] });
  assert.equal(i.kind, "aprovacao");
  assert.equal(i.approvalId, 42);
  assert.equal(i.actionLabel, "Confirmar");
});

test("contas: vencida é urgente, até 3 dias é atenção, mais longe fica de fora", () => {
  const bill = (id: number, dueDate: string | null) => ({ id, description: `Conta ${id}`, supplier: "Posto", amountCents: 10_000, dueDate });
  const q = buildQueue({ ...base, bills: [bill(1, "2026-10-29"), bill(2, "2026-10-30"), bill(3, "2026-11-02"), bill(4, "2026-11-03"), bill(5, null)] });
  assert.deepEqual(q.map((i) => [i.id, i.tone]), [["ct:1", "urgente"], ["ct:2", "atencao"], ["ct:3", "atencao"]]);
  assert.equal(q[0].title, "Conta vencida: Conta 1");
  assert.match(q[0].detail, /R\$\s10\.000,00|R\$\s100,00/);
  assert.match(q[0].detail, /venceu ontem \(29\/10\/2026\)/);
  assert.equal(q[1].title, "Conta vence hoje: Conta 2");
  assert.equal(q[2].title, "Conta vence em 3 dias: Conta 3");
});

test("WhatsApp sem conexão vira um item de sistema logo no topo do nível", () => {
  const q = buildQueue({ ...base, whatsappConfigured: false, alerts: [alert({})] });
  assert.equal(q[0].kind, "sistema");
  assert.equal(q[0].href, "/admin/conexoes");
});

// ─── próximas paradas ────────────────────────────────────────

test("buildStops: só o que ainda vai acontecer, na ordem das datas, com o texto certo", () => {
  const o = (id: number, eventDate: string | null, payments: string[] = []) => ({
    id,
    status: "confirmado",
    statusLabel: "Confirmado",
    eventDate,
    eventTime: "16:30",
    city: "Taquara",
    venue: "Igreja Matriz",
    client: { name: `Casal ${id}` },
    payments: payments.map((status) => ({ status })),
  });
  const stops = buildStops([o(3, "2026-11-20"), o(1, "2026-11-03", ["recebido", "a_receber"]), o(2, "2026-10-29"), o(4, null), o(5, "2026-10-30", ["recebido"])], today);
  assert.deepEqual(stops.map((s) => [s.orderId, s.when, s.pendingPayment]), [[5, "hoje", false], [1, "em 4 dias", true], [3, "em 21 dias", false]]);
  assert.equal(stops[1].place, "Igreja Matriz, Taquara");
  assert.equal(buildStops([o(1, "2026-11-03"), o(2, "2026-11-04")], today, 1).length, 1);
});
