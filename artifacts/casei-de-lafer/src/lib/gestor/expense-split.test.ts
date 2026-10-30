import { test } from "node:test";
import assert from "node:assert/strict";
import { appendNote, describeExpensePayment, planExpensePayment, type OpenExpense } from "./expense-split.ts";
import { formatBRL } from "./rules.ts";

// A conta que motivou o recurso: saldo da retífica, R$ 6.582,00, e um pedido de abater R$ 1.500,00.
const retifica: OpenExpense = {
  description: "Retífica do motor: saldo",
  amountCents: 658_200,
  status: "a_pagar",
  notes: "À vista com desconto de R$ 886 ficaria R$ 5.696.",
  supplier: "RM Nantal (Taquara)",
};

test("abater parte: o saldo diminui e a parte paga vira outra despesa, sem mudar o total", () => {
  const plan = planExpensePayment(retifica, 150_000, "2026-10-29", 658_200);
  assert.equal(plan.kind, "parcial");
  if (plan.kind !== "parcial") return;
  assert.equal(plan.remainingCents, 508_200);
  assert.equal(plan.remainingCents + 150_000, retifica.amountCents);
  assert.equal(plan.paidDescription, "Retífica do motor: saldo (abatimento)");
  assert.match(plan.openNotes, /^À vista com desconto de R\$ 886 ficaria R\$ 5\.696\. Abatidos /);
  assert.ok(plan.openNotes.includes(formatBRL(150_000)));
  assert.ok(plan.openNotes.includes("29/10/2026"));
  assert.ok(plan.openNotes.includes(`o saldo era ${formatBRL(658_200)}`));
  assert.ok(plan.paidNotes.includes("Retífica do motor: saldo"));
});

test("abater tudo quita a conta inteira, sem criar despesa nova", () => {
  const plan = planExpensePayment(retifica, 658_200, "2026-10-29", 658_200);
  assert.equal(plan.kind, "total");
  assert.ok(plan.openNotes.includes("Quitada em 29/10/2026"));
  assert.ok(plan.openNotes.startsWith("À vista com desconto"));
});

test("valor maior que o saldo é recusado", () => {
  assert.throws(() => planExpensePayment(retifica, 658_201, "2026-10-29"), { code: "valor_maior" });
});

test("valor zero, negativo ou quebrado é recusado", () => {
  for (const v of [0, -100, 1500.5, Number.NaN]) {
    assert.throws(() => planExpensePayment(retifica, v, "2026-10-29"), { code: "valor_invalido" });
  }
});

test("conta já paga não é abatida de novo", () => {
  assert.throws(() => planExpensePayment({ ...retifica, status: "pago" }, 100, "2026-10-29"), { code: "ja_paga" });
});

test("se o saldo mudou depois da confirmação, recusa em vez de abater o valor errado", () => {
  assert.throws(() => planExpensePayment({ ...retifica, amountCents: 508_200 }, 150_000, "2026-10-29", 658_200), { code: "conta_mudou" });
  // sem saldo esperado (uso direto do código), não confere
  assert.equal(planExpensePayment({ ...retifica, amountCents: 508_200 }, 150_000, "2026-10-29").kind, "parcial");
});

test("descrição muito longa continua cabendo no limite com o sufixo", () => {
  const plan = planExpensePayment({ ...retifica, description: "x".repeat(300) }, 100, "2026-10-29");
  assert.equal(plan.kind, "parcial");
  if (plan.kind !== "parcial") return;
  assert.ok(plan.paidDescription.length <= 300);
  assert.ok(plan.paidDescription.endsWith(" (abatimento)"));
});

test("observações: acrescenta, aceita vazio e respeita o limite de 2000 caracteres", () => {
  assert.equal(appendNote("", "novo"), "novo");
  assert.equal(appendNote("  antigo  ", "novo"), "antigo novo");
  const long = appendNote("a".repeat(1990), "b".repeat(30));
  assert.equal(long.length, 2000);
  assert.ok(long.endsWith("b".repeat(30)));
});

test("texto da confirmação: parcial e total", () => {
  const parcial = describeExpensePayment(retifica, 150_000, "2026-10-29");
  assert.ok(parcial.includes(`Abater *${formatBRL(150_000)}* da conta *Retífica do motor: saldo* (RM Nantal (Taquara))`));
  assert.ok(parcial.includes(`${formatBRL(658_200)} → fica ${formatBRL(508_200)} em aberto`));
  assert.ok(parcial.includes("Pago em 29/10/2026. O custo total não muda."));

  const total = describeExpensePayment(retifica, 658_200, "2026-10-29");
  assert.ok(total.startsWith("Quitar a conta *Retífica do motor: saldo*"));
  assert.ok(total.includes(`Valor: ${formatBRL(658_200)}`));
});

test("texto da confirmação sem fornecedor não deixa parênteses vazios", () => {
  const text = describeExpensePayment({ ...retifica, supplier: "" }, 100_000, "2026-10-29");
  assert.ok(!text.includes("()"));
});
