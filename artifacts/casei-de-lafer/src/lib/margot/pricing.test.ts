import { test } from "node:test";
import assert from "node:assert/strict";
import { costMicroUsd } from "./pricing.ts";

test("custo por modelo, em milionésimos de dólar", () => {
  // 20 mil tokens de entrada + 2 mil de saída no Sonnet: 20k×2 + 2k×10 = 60.000 µUS$ = US$ 0,06
  assert.equal(costMicroUsd("claude-sonnet-5-5", 20_000, 2_000), 60_000);
  // Mesmo uso no Haiku: 20k×0,10 + 2k×0,50 = 3.000 µUS$ = US$ 0,003
  assert.equal(costMicroUsd("claude-haiku-5-5", 20_000, 2_000), 3_000);
  // Haiku acima de 100 mil tokens de entrada usa a tabela maior
  assert.equal(costMicroUsd("claude-haiku-5-5", 120_000, 0), 60_000);
  // Modelo desconhecido: preço do Sonnet
  assert.equal(costMicroUsd("modelo-x", 1_000_000, 0), 2_000_000);
});
