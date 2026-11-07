import { test } from "node:test";
import assert from "node:assert/strict";
import { avaliarExclusao, type PedidoDaRegra } from "./exclusao.ts";

const pix = (amountCents: number, paidAt: string, status = "recebido") => ({ amountCents, status, paidAt });
const pedido = (id: number, extra: Partial<PedidoDaRegra> = {}): PedidoDaRegra => ({
  id,
  clientId: 10,
  status: "realizado",
  eventDate: "2026-01-22",
  payments: [],
  ...extra,
});

test("sem pagamento recebido pode excluir, e avisa se há um igual", () => {
  const sozinho = avaliarExclusao(pedido(6), []);
  assert.deepEqual(sozinho, { pode: true, duplicadoDe: null, recebidoCents: 0, recebidos: 0 });
  const comIgual = avaliarExclusao(pedido(6, { payments: [pix(40000, "2026-01-19", "a_receber")] }), [pedido(5)]);
  assert.equal(comIgual.pode, true);
  assert.equal(comIgual.pode && comIgual.duplicadoDe, 5);
});

test("duplicado com pagamento: o gêmeo tem os mesmos pagamentos (e mais)", () => {
  const original = pedido(5, { payments: [pix(40000, "2026-01-19"), pix(55000, "2026-01-22")] });
  const copia = pedido(6, { payments: [pix(40000, "2026-01-19"), pix(55000, "2026-01-22", "a_receber")] });
  const r = avaliarExclusao(copia, [original]);
  assert.equal(r.pode, true);
  assert.equal(r.pode && r.duplicadoDe, 5);
  assert.equal(r.recebidoCents, 40000);
  assert.equal(r.recebidos, 1);
});

test("o original (com mais dinheiro) não pode ser excluído por causa da cópia", () => {
  const original = pedido(5, { payments: [pix(40000, "2026-01-19"), pix(55000, "2026-01-22")] });
  const copia = pedido(6, { payments: [pix(40000, "2026-01-19")] });
  const r = avaliarExclusao(original, [copia]);
  assert.equal(r.pode, false);
  assert.match(!r.pode ? r.motivo : "", /R\$\s?950,00/);
  assert.match(!r.pode ? r.motivo : "", /cancelar/);
});

test("pagamento recebido sem pedido igual: não exclui", () => {
  const r = avaliarExclusao(pedido(7, { payments: [pix(100000, "2026-03-01")] }), []);
  assert.equal(r.pode, false);
});

test("gêmeo de outro cliente, de outra data ou cancelado não vale", () => {
  const meu = pedido(6, { payments: [pix(40000, "2026-01-19")] });
  const igual = { payments: [pix(40000, "2026-01-19")] };
  assert.equal(avaliarExclusao(meu, [pedido(5, { ...igual, clientId: 99 })]).pode, false);
  assert.equal(avaliarExclusao(meu, [pedido(5, { ...igual, eventDate: "2026-01-23" })]).pode, false);
  assert.equal(avaliarExclusao(meu, [pedido(5, { ...igual, status: "cancelado" })]).pode, false);
  assert.equal(avaliarExclusao(meu, [pedido(5, { ...igual, status: "perdido" })]).pode, false);
});

test("pedido sem data nunca é gêmeo", () => {
  const meu = pedido(6, { eventDate: null, payments: [pix(40000, "2026-01-19")] });
  const outro = pedido(5, { eventDate: null, payments: [pix(40000, "2026-01-19")] });
  assert.equal(avaliarExclusao(meu, [outro]).pode, false);
});

test("valor ou dia diferente não cobre", () => {
  const meu = pedido(6, { payments: [pix(40000, "2026-01-19")] });
  assert.equal(avaliarExclusao(meu, [pedido(5, { payments: [pix(40100, "2026-01-19")] })]).pode, false);
  assert.equal(avaliarExclusao(meu, [pedido(5, { payments: [pix(40000, "2026-01-20")] })]).pode, false);
});

test("dois pagamentos iguais no mesmo dia precisam de dois no gêmeo", () => {
  const meu = pedido(6, { payments: [pix(20000, "2026-01-19"), pix(20000, "2026-01-19")] });
  assert.equal(avaliarExclusao(meu, [pedido(5, { payments: [pix(20000, "2026-01-19")] })]).pode, false);
  assert.equal(
    avaliarExclusao(meu, [pedido(5, { payments: [pix(20000, "2026-01-19"), pix(20000, "2026-01-19")] })]).pode,
    true,
  );
});

test("pagamento ainda em aberto (a receber) não conta como dinheiro recebido", () => {
  const r = avaliarExclusao(pedido(6, { payments: [pix(40000, "2026-01-19", "a_receber"), pix(1000, "2026-01-19", "cancelado")] }), []);
  assert.equal(r.pode, true);
  assert.equal(r.recebidoCents, 0);
});
