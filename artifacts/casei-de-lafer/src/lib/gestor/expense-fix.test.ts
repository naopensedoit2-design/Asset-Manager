import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkExpenseRemoval,
  cleanChanges,
  describeExpenseFix,
  describeExpenseRemoval,
  planExpenseFix,
  snapshotOf,
  type StoredExpense,
} from "./expense-fix.ts";

const gasolina = (over: Partial<StoredExpense> = {}): StoredExpense => ({
  id: 7,
  date: "2026-11-13",
  description: "Gasolina",
  category: "combustivel",
  supplier: "",
  amountCents: 5000,
  status: "pago",
  dueDate: null,
  paidAt: "2026-11-13",
  notes: "Lançada pelo WhatsApp (Margot).",
  orderId: null,
  ...over,
});
const HOJE = "2026-11-15";

test("só guarda o que muda", () => {
  assert.deepEqual(cleanChanges(gasolina(), { data: "2026-11-15", valorCents: 5000 }, HOJE), { data: "2026-11-15" });
  assert.deepEqual(cleanChanges(gasolina(), { descricao: "  Gasolina   posto ", categoria: "combustivel" }, HOJE), {
    descricao: "Gasolina posto",
  });
});

test("nada mudando, data ou valor inválidos viram pergunta", () => {
  assert.equal(typeof cleanChanges(gasolina(), { data: "2026-11-13" }, HOJE), "string");
  assert.equal(typeof cleanChanges(gasolina(), {}, HOJE), "string");
  assert.equal(typeof cleanChanges(gasolina(), { data: "15/11" }, HOJE), "string");
  assert.equal(typeof cleanChanges(gasolina(), { valorCents: 0 }, HOJE), "string");
  assert.equal(typeof cleanChanges(gasolina(), { categoria: "viagem" }, HOJE), "string");
});

test("despesa paga não vai para o futuro; a pagar pode", () => {
  assert.equal(typeof cleanChanges(gasolina(), { data: "2026-11-20" }, HOJE), "string");
  assert.deepEqual(cleanChanges(gasolina({ status: "a_pagar", paidAt: null }), { data: "2026-11-20" }, HOJE), { data: "2026-11-20" });
});

test("nunca troca o ano: a data é a que ele disse", () => {
  const c = cleanChanges(gasolina(), { data: "2026-01-10" }, HOJE);
  assert.deepEqual(c, { data: "2026-01-10" });
  assert.equal(planExpenseFix(gasolina(), { data: "2026-01-10" }, snapshotOf(gasolina())).date, "2026-01-10");
});

test("pagamento no mesmo dia acompanha a data nova; pagamento em outro dia fica", () => {
  const e = gasolina();
  const p = planExpenseFix(e, { data: "2026-11-15" }, snapshotOf(e));
  assert.equal(p.date, "2026-11-15");
  assert.equal(p.paidAt, "2026-11-15");
  assert.equal(p.amountCents, 5000);
  assert.equal(p.description, "Gasolina");
  assert.match(p.notes, /Corrigida pelo WhatsApp \(Margot\): data\./);

  const outro = gasolina({ paidAt: "2026-11-14" });
  assert.equal(planExpenseFix(outro, { data: "2026-11-10" }, snapshotOf(outro)).paidAt, "2026-11-14");
});

test("conta a pagar continua a pagar, com o vencimento", () => {
  const e = gasolina({ status: "a_pagar", paidAt: null, dueDate: "2026-12-01" });
  const p = planExpenseFix(e, { valorCents: 5500 }, snapshotOf(e));
  assert.equal(p.status, "a_pagar");
  assert.equal(p.dueDate, "2026-12-01");
  assert.equal(p.paidAt, null);
  assert.equal(p.amountCents, 5500);
});

test("despesa que mudou depois do botão é recusada", () => {
  const visto = snapshotOf(gasolina());
  assert.throws(() => planExpenseFix(gasolina({ amountCents: 5500 }), { data: "2026-11-15" }, visto), /mudou/);
  assert.throws(() => checkExpenseRemoval(gasolina({ date: "2026-11-14" }), visto), /mudou/);
  assert.doesNotThrow(() => checkExpenseRemoval(gasolina(), visto));
});

test("botões mostram como está e como fica", () => {
  const t = describeExpenseFix(gasolina(), { data: "2026-11-15", valorCents: 5500 });
  assert.match(t, /Data: 13\/11\/2026 → 15\/11\/2026/);
  assert.match(t, /Valor: R\$\s?50,00 → R\$\s?55,00/);
  assert.match(describeExpenseRemoval(gasolina()), /Apagar despesa: \*Gasolina\*/);
});
