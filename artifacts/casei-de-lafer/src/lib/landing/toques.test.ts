import assert from "node:assert/strict";
import { test } from "node:test";
import { campanhaAGravar, chaveDoToque, diaSaoPaulo, MAX_LINHAS_POR_DIA, mesSaoPaulo, prefixoDoDia } from "./toques.ts";

test("o dia vale no fuso de São Paulo, não em UTC", () => {
  // 01h de 3/11 em UTC ainda é noite de 2/11 em São Paulo (UTC-3)
  assert.equal(diaSaoPaulo(new Date("2026-11-03T01:00:00Z")), "2026-11-02");
  assert.equal(diaSaoPaulo(new Date("2026-11-03T03:00:00Z")), "2026-11-03");
  assert.equal(diaSaoPaulo(new Date("2026-11-03T23:30:00Z")), "2026-11-03");
});

test("o mês do calendário vale no fuso de São Paulo, também nas últimas 3 horas do mês", () => {
  // 1/12 02h em UTC ainda é 30/11 23h em São Paulo: o servidor (UTC) diria dezembro, o público brasileiro vê novembro
  assert.equal(mesSaoPaulo(new Date("2026-12-01T02:00:00Z")), "2026-11");
  assert.equal(mesSaoPaulo(new Date("2026-12-01T03:00:00Z")), "2026-12");
  assert.equal(mesSaoPaulo(new Date("2027-01-01T01:00:00Z")), "2026-12");
});

test("a chave junta dia, canal, botão e campanha", () => {
  assert.equal(chaveDoToque("2026-11-03", "chat", "topo", "teste-2-datas"), "clique:2026-11-03:chat:topo:teste-2-datas");
  assert.equal(chaveDoToque("2026-11-03", "whatsapp", "outro", "sem-origem"), "clique:2026-11-03:whatsapp:outro:sem-origem");
  assert.equal(prefixoDoDia("2026-11-03"), "clique:2026-11-03:");
});

test("limite de linhas por dia: combinação nova vira 'outra', a que já existe continua somando", () => {
  assert.equal(campanhaAGravar("x", 10, false), "x");
  assert.equal(campanhaAGravar("x", MAX_LINHAS_POR_DIA, false), "outra");
  assert.equal(campanhaAGravar("x", MAX_LINHAS_POR_DIA + 50, true), "x");
});
