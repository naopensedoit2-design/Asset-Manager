import { test } from "node:test";
import assert from "node:assert/strict";
import { acaoCanonica, botaoRepetido, JANELA_REPETIDA_MS, type BotaoPendente } from "./repetida.ts";

const agora = new Date("2026-11-12T21:41:00Z");
const acao = JSON.stringify({ tipo: "pagamento", pedido: 7, pagamento: "saldo", comprovante: 101 });
const b = (id: number, over: Partial<BotaoPendente> = {}): BotaoPendente => ({
  id,
  action: acao,
  createdAt: new Date(agora.getTime() - 60_000),
  actionDoneAt: null,
  ...over,
});

test("mesma ação pendente e recente: não manda outro botão", () => {
  assert.equal(botaoRepetido([b(10)], acao, agora), 10);
});

test("a ordem das chaves não muda a ação", () => {
  const outraOrdem = JSON.stringify({ comprovante: 101, pagamento: "saldo", pedido: 7, tipo: "pagamento" });
  assert.equal(acaoCanonica(outraOrdem), acaoCanonica(acao));
  assert.equal(botaoRepetido([b(10)], outraOrdem, agora), 10);
});

test("botão já respondido não segura um novo", () => {
  assert.equal(botaoRepetido([b(10, { actionDoneAt: agora })], acao, agora), null);
});

test("botão antigo não segura um novo", () => {
  assert.equal(botaoRepetido([b(10, { createdAt: new Date(agora.getTime() - JANELA_REPETIDA_MS - 1) })], acao, agora), null);
});

test("ação diferente (outro pedido, sinal em vez de saldo) manda o botão", () => {
  assert.equal(botaoRepetido([b(10)], JSON.stringify({ tipo: "pagamento", pedido: 8, pagamento: "saldo", comprovante: 101 }), agora), null);
  assert.equal(botaoRepetido([b(10)], JSON.stringify({ tipo: "pagamento", pedido: 7, pagamento: "sinal", comprovante: 101 }), agora), null);
});

test("com vários iguais, devolve o mais novo", () => {
  assert.equal(botaoRepetido([b(10), b(12), b(11)], acao, agora), 12);
});
