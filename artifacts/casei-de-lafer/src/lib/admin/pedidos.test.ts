import assert from "node:assert/strict";
import { test } from "node:test";
import { eventWhen, filterCounts, filterOrders, latestQuoteCents, matchesQuery, normalize, paymentSummary, type OrderLite } from "./pedidos.ts";

const o = (id: number, status: string, eventDate: string | null, name: string, extra: Partial<OrderLite> = {}): OrderLite => ({
  id,
  status,
  eventDate,
  eventTime: "",
  venue: "",
  city: "",
  client: { name, phone: "5554999990000" },
  quotes: [],
  payments: [],
  ...extra,
});

const orders: OrderLite[] = [
  o(1, "novo", "2027-02-12", "Camila & Rafael", { venue: "Vila Verde", city: "Bento Gonçalves" }),
  o(2, "orcamento_enviado", "2026-12-05", "Bianca & Thiago"),
  o(3, "aguardando_resposta", "2026-11-28", "Juliana & Pedro"),
  o(4, "confirmado", "2026-11-14", "Letícia & Marcello"),
  o(5, "realizado", "2026-09-20", "Ana & Rodrigo"),
  o(6, "realizado", "2026-08-02", "Daniela & Mateus"),
  o(7, "perdido", null, "Sem Data & Silva"),
  o(8, "cancelado", "2026-10-30", "Fernanda & Lucas", { client: { name: "Fernanda & Lucas", phone: "5554988887777" } }),
];

test("normalize tira acento e caixa", () => {
  assert.equal(normalize("  Mônica Vargas "), "monica vargas");
});

test("busca por nome sem acento, telefone, local e número do pedido", () => {
  const leticia = orders[3];
  assert.ok(matchesQuery(leticia, "leticia"));
  assert.ok(matchesQuery(leticia, "LETÍCIA"));
  assert.ok(!matchesQuery(leticia, "rafael"));
  assert.ok(matchesQuery(orders[0], "vila verde"));
  assert.ok(matchesQuery(orders[0], "bento"));
  assert.ok(matchesQuery(orders[7], "88887777"), "pelo telefone");
  assert.ok(matchesQuery(orders[3], "#4"));
  assert.ok(matchesQuery(orders[3], "4"));
  assert.ok(!matchesQuery(orders[2], "#4"));
  assert.ok(matchesQuery(orders[0], ""), "busca vazia acha tudo");
  assert.ok(!matchesQuery(orders[0], "12"), "dois dígitos não casam com o telefone nem com o pedido 1");
});

test("filtros e ordem: o que vem aí por data, o que passou do mais recente", () => {
  assert.deepEqual(filterOrders(orders, "andamento").map((x) => x.id), [3, 2, 1]);
  assert.deepEqual(filterOrders(orders, "confirmados").map((x) => x.id), [4]);
  assert.deepEqual(filterOrders(orders, "realizados").map((x) => x.id), [5, 6]);
  assert.deepEqual(filterOrders(orders, "encerrados").map((x) => x.id), [8, 7], "sem data vai para o fim");
  assert.deepEqual(filterOrders(orders, "todos").map((x) => x.id), [8, 7, 6, 5, 4, 3, 2, 1]);
});

test("contagem por filtro respeita a busca", () => {
  assert.deepEqual(filterCounts(orders), { andamento: 3, confirmados: 1, realizados: 2, encerrados: 2, todos: 8 });
  assert.deepEqual(filterCounts(orders, "rafael"), { andamento: 1, confirmados: 0, realizados: 0, encerrados: 0, todos: 1 });
});

test("resumo de pagamento: recebido, total e a próxima parcela", () => {
  const today = "2026-10-30";
  const s = paymentSummary(
    {
      payments: [
        { kind: "sinal", amountCents: 104_000, status: "recebido", dueDate: "2026-09-01" },
        { kind: "saldo", amountCents: 104_000, status: "a_receber", dueDate: "2026-11-10" },
        { kind: "extra", amountCents: 50_000, status: "cancelado", dueDate: null },
      ],
    },
    today,
  );
  assert.equal(s.receivedCents, 104_000);
  assert.equal(s.totalCents, 208_000, "o cancelado não entra");
  assert.deepEqual(s.open, { kind: "saldo", amountCents: 104_000, dueDate: "2026-11-10", overdue: false });

  const atrasado = paymentSummary({ payments: [{ kind: "sinal", amountCents: 100, status: "a_receber", dueDate: "2026-10-01" }] }, today);
  assert.equal(atrasado.open?.overdue, true, "vencido mesmo sem estar marcado como atrasado");
  assert.equal(paymentSummary({ payments: [] }, today).open, null);
});

test("orçamento mais recente e texto de data", () => {
  assert.equal(latestQuoteCents({ quotes: [{ totalCents: 208_000 }, { totalCents: 190_000 }] }), 208_000);
  assert.equal(latestQuoteCents({ quotes: [] }), null);
  assert.equal(eventWhen("2026-10-30", "2026-10-30"), "hoje");
  assert.equal(eventWhen("2026-10-31", "2026-10-30"), "amanhã");
  assert.equal(eventWhen("2026-11-03", "2026-10-30"), "em 4 dias");
  assert.equal(eventWhen("2026-10-29", "2026-10-30"), "ontem");
  assert.equal(eventWhen("2026-09-30", "2026-10-30"), "há 30 dias");
  assert.equal(eventWhen(null, "2026-10-30"), "sem data");
});
