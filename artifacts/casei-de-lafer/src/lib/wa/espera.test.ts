import { test } from "node:test";
import assert from "node:assert/strict";
import { esperaResposta, estadoIA, parseFalhaIA, soAcolhimento } from "./espera.ts";

const msg = (direction: string, author: string, kind = "") => ({ direction, author, kind });

test("a pessoa falou por último: espera resposta", () => {
  assert.equal(esperaResposta(msg("in", "cliente")), true);
  assert.equal(soAcolhimento(msg("in", "cliente")), false);
});

test("só a reserva da Margot sem IA respondeu: ainda espera a equipe", () => {
  assert.equal(esperaResposta(msg("out", "sistema", "reserva")), true);
  assert.equal(soAcolhimento(msg("out", "sistema", "reserva")), true);
});

test("só a resposta automática respondeu: ainda espera a equipe", () => {
  assert.equal(esperaResposta(msg("out", "sistema", "resposta_automatica")), true);
});

test("resposta da Margot ou da equipe encerra a espera", () => {
  assert.equal(esperaResposta(msg("out", "margot")), false);
  assert.equal(esperaResposta(msg("out", "leonardo")), false);
});

test("pedido de reenvio e outros avisos do sistema não contam como espera da equipe", () => {
  assert.equal(esperaResposta(msg("out", "sistema", "sem_suporte")), false);
  assert.equal(esperaResposta(msg("out", "sistema", "lembrete")), false);
  assert.equal(esperaResposta(msg("out", "sistema", "")), false);
});

test("sem mensagem: não espera", () => {
  assert.equal(esperaResposta(null), false);
  assert.equal(esperaResposta(undefined), false);
});

test("estado da IA: sem falha registrada", () => {
  assert.equal(estadoIA(null, () => "x"), "Sem falha da IA registrada.");
});

test("estado da IA: falha antiga aparece com a data e como coisa passada", () => {
  const t = estadoIA({ at: Date.UTC(2026, 0, 10, 15), motivo: "a chave foi recusada" }, () => "10/01/2026 12:00");
  assert.match(t, /10\/01\/2026 12:00/);
  assert.match(t, /a chave foi recusada/);
  assert.match(t, /coisa passada/);
});

test("parseFalhaIA aceita o formato gravado e recusa o resto", () => {
  assert.deepEqual(parseFalhaIA(JSON.stringify({ at: 1, motivo: "m" })), { at: 1, motivo: "m" });
  assert.equal(parseFalhaIA(""), null);
  assert.equal(parseFalhaIA(null), null);
  assert.equal(parseFalhaIA("{quebrado"), null);
  assert.equal(parseFalhaIA(JSON.stringify({ at: "1", motivo: "m" })), null);
});
