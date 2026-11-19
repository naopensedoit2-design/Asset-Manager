import { test } from "node:test";
import assert from "node:assert/strict";
import { prometeBotao } from "./promessa.ts";

test("promessa de botão sem botão é reconhecida", () => {
  assert.ok(prometeBotao("Deixei pronto o lançamento do *Quepe de Chofer*, pago e com data de hoje. É só tocar em Confirmar no botão."));
  assert.ok(prometeBotao("⛽ Deixei a despesa pronta... é só tocar em *Confirmar*."));
  assert.ok(prometeBotao("Preparei o lançamento. O botão chega logo abaixo."));
  assert.ok(prometeBotao("Toque em ✅ Confirmar quando puder."));
});

test("resposta comum ou botão antigo não disparam", () => {
  assert.ok(!prometeBotao("Despesa lançada: Gasolina · R$ 50,00. Já aparece no Financeiro."));
  assert.ok(!prometeBotao("Qual vale? R$ 5,00 ou R$ 50,00?"));
  assert.ok(!prometeBotao("Esse botão já foi mandado: falta só tocar em Confirmar no botão acima."));
  assert.ok(!prometeBotao("A conversa do Fulano está ignorada."));
});
