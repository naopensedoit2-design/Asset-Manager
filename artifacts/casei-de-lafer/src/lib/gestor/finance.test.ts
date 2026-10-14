import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFinance } from "./finance.ts";

// Os gastos reais do Lafer em 2026, como vieram nos recibos da RM Nantal.
const expenses = [
  { date: "2026-07-02", category: "manutencao", amountCents: 247900, status: "pago", paidAt: "2026-07-02", dueDate: null },
  { date: "2026-08-28", category: "manutencao", amountCents: 210000, status: "pago", paidAt: "2026-08-28", dueDate: null },
  { date: "2026-08-28", category: "manutencao", amountCents: 650000, status: "pago", paidAt: "2026-09-20", dueDate: null },
  { date: "2026-08-28", category: "manutencao", amountCents: 658200, status: "a_pagar", paidAt: null, dueDate: "2026-10-10" },
  { date: "2026-05-10", category: "guincho", amountCents: 50000, status: "pago", paidAt: "2026-05-10", dueDate: null },
  { date: "2026-09-01", category: "sistemas", amountCents: 10000, status: "pago", paidAt: "2026-09-01", dueDate: null },
];
const payments = [
  { amountCents: 124000, status: "recebido", paidAt: "2026-08-19" },
  { amountCents: 96000, status: "recebido", paidAt: "2026-09-05" },
  { amountCents: 186000, status: "a_receber", paidAt: null },
];

test("ano: entrou, saiu, resultado e o que está em aberto", () => {
  const f = computeFinance({ period: "2026", today: "2026-10-14", expenses, payments, events: ["2026-12-05", "2026-12-19"] });
  assert.equal(f.entrouCents, 220000);
  assert.equal(f.saiuCents, 247900 + 210000 + 650000 + 50000 + 10000);
  assert.equal(f.resultadoCents, f.entrouCents - f.saiuCents);
  assert.equal(f.aReceberCents, 186000);
  assert.equal(f.aPagarCents, 658200);
  assert.equal(f.aPagarVencidoCents, 658200, "vencido em 10/10");
  // Custo do carro conta pelo serviço feito, mesmo o que falta pagar: 2.479 + 15.182 + 500.
  assert.equal(f.custoVeiculoCents, 247900 + 1518200 + 50000);
  assert.equal(f.porCategoria[0].key, "manutencao");
  assert.equal(f.eventos, 2);
  assert.equal(f.meses.length, 12);
  assert.equal(f.meses[8].saiuCents, 650000 + 10000, "setembro");
});

test("mês: só o caixa do mês, compromissos continuam aparecendo", () => {
  const f = computeFinance({ period: "2026-08", today: "2026-10-14", expenses, payments, events: [] });
  assert.equal(f.entrouCents, 124000);
  assert.equal(f.saiuCents, 210000);
  assert.equal(f.aPagarCents, 658200);
  assert.equal(f.custoPorEventoCents, null);
  assert.equal(f.meses.length, 0);
});
