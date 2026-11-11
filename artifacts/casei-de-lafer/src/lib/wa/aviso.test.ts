import { test } from "node:test";
import assert from "node:assert/strict";
import { JANELA_AVISO_MS, deveAvisar, lerUltimoAviso } from "./aviso.ts";

const t0 = 1_800_000_000_000;

test("sem aviso anterior, ou depois da janela, avisa", () => {
  assert.equal(deveAvisar(null, t0, "qualquer coisa"), true);
  assert.equal(deveAvisar({ at: t0, motivo: "Casamento fora da Serra" }, t0 + JANELA_AVISO_MS, "Casamento fora da Serra"), true);
});

test("assunto novo dentro da janela também avisa (o caso do fotógrafo)", () => {
  const anterior = { at: t0, motivo: "Carro da Noiva e ensaio em cidade fora da Serra, sem data." };
  assert.equal(deveAvisar(anterior, t0 + 60_000, "Perguntou se indicamos fotógrafo."), true);
});

test("o mesmo assunto repetido em sequência não avisa de novo", () => {
  const anterior = { at: t0, motivo: "Pediu desconto no Carro da Noiva" };
  assert.equal(deveAvisar(anterior, t0 + 60_000, "pediu desconto no carro da noiva!"), false);
  assert.equal(deveAvisar(anterior, t0 + 60_000, "Pediu desconto"), false);
});

test("lê o registro salvo e ignora lixo", () => {
  assert.deepEqual(lerUltimoAviso(JSON.stringify({ at: t0, motivo: "x" })), { at: t0, motivo: "x" });
  assert.equal(lerUltimoAviso("não é json"), null);
  assert.equal(lerUltimoAviso(""), null);
  assert.equal(lerUltimoAviso(JSON.stringify({ at: "ontem" })), null);
});
