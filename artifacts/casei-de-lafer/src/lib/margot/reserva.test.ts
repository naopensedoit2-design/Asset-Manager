import { test } from "node:test";
import assert from "node:assert/strict";
import { AVISO_SEM_IA_MS, deveAvisarSemIA, motivoFalhaIA, RESERVA_TEXTO_FIXO, respostaReservaSegura } from "./reserva.ts";

test("resposta da reserva: acolhimento passa", () => {
  assert.ok(respostaReservaSegura("Olá! Que alegria receber sua mensagem sobre o casamento. Nossa equipe já foi avisada e te responde por aqui em breve."));
  assert.ok(respostaReservaSegura(RESERVA_TEXTO_FIXO));
});

test("resposta da reserva: valor, número, data livre ou confirmação não passam", () => {
  assert.equal(respostaReservaSegura("O carro fica a partir de R$ 2.400."), false);
  assert.equal(respostaReservaSegura("Para o dia 12 temos horário, nossa equipe confirma."), false);
  assert.equal(respostaReservaSegura("Essa data está disponível! Nossa equipe te chama."), false);
  assert.equal(respostaReservaSegura("Sua reserva está confirmada, obrigada!"), false);
  assert.equal(respostaReservaSegura("Vai ser um dia inesquecível! Nossa equipe te responde."), false);
  assert.equal(respostaReservaSegura("Oi"), false);
});

test("motivo da falha em palavras do dono", () => {
  assert.match(motivoFalhaIA('Claude API 401: {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}'), /chave .* recusada/);
  assert.match(motivoFalhaIA("Claude API 400: Your credit balance is too low to access the Anthropic API"), /crédito/);
  assert.match(motivoFalhaIA("Claude API 529: overloaded_error"), /fora do ar|sobrecarregada/);
  assert.match(motivoFalhaIA("sem chave"), /não está configurada/);
  assert.match(motivoFalhaIA("limite do mês"), /limite mensal/);
  assert.equal(motivoFalhaIA("Claude API 418: ?"), "a API do Claude falhou");
  assert.match(motivoFalhaIA("TypeError: x is undefined"), /erro inesperado/);
});

test("aviso ao dono: na primeira vez, quando o motivo muda e depois do intervalo", () => {
  const agora = 1_000_000_000;
  assert.ok(deveAvisarSemIA(null, agora, "x"));
  assert.equal(deveAvisarSemIA({ at: agora - 60_000, motivo: "x" }, agora, "x"), false);
  assert.ok(deveAvisarSemIA({ at: agora - 60_000, motivo: "x" }, agora, "y"));
  assert.ok(deveAvisarSemIA({ at: agora - AVISO_SEM_IA_MS, motivo: "x" }, agora, "x"));
});
