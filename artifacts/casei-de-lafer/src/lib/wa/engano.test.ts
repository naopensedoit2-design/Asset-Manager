import { test } from "node:test";
import assert from "node:assert/strict";
import { ENGANO_TEXTO } from "./engano.ts";
import { looksLikeLead, triageInbound } from "./triage.ts";

test("mensagem de engano: apresenta a Margot e a empresa, diz que pode ser engano e convida a voltar", () => {
  assert.match(ENGANO_TEXTO, /número errado/);
  assert.match(ENGANO_TEXTO, /Margot/);
  assert.match(ENGANO_TEXTO, /Eu Casei de Lafer/);
  assert.match(ENGANO_TEXTO, /nossa equipe/);
  assert.doesNotMatch(ENGANO_TEXTO, /R\$|\d{2,}/); // sem preço nem número
  assert.doesNotMatch(ENGANO_TEXTO, /inesquec|sonho|conto de fadas/i);
  assert.ok(ENGANO_TEXTO.length < 400, "curta");
});

test("depois do engano, quem responde falando de casamento volta a ser atendido", () => {
  const ignorada = { isNew: false, isOwner: false, isClient: false, ignored: true, reason: "engano" };
  const msg = (text: string) => ({ type: "text", text, forwarded: false });
  assert.equal(triageInbound(ignorada, msg("Sim, é para o meu casamento")).change, "reativar");
  assert.equal(triageInbound(ignorada, msg("Quero a entrega da noiva")).change, "reativar");
  assert.equal(triageInbound(ignorada, msg("Ah, desculpa! Foi engano mesmo")).ignored, true);
  assert.equal(looksLikeLead("Parabéns por conseguirem retornar ao restaurante"), false);
});
