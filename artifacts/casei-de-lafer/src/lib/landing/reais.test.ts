import assert from "node:assert/strict";
import { test } from "node:test";
import { reais } from "./reais.ts";

const normal = (s: string) => s.replace(/ /g, " ");

test("valor inteiro sai sem centavos", () => {
  assert.equal(normal(reais(260000)), "R$ 2.600");
  assert.equal(normal(reais(50000)), "R$ 500");
  assert.equal(normal(reais(190000)), "R$ 1.900");
});

test("valor com centavos mantém os centavos", () => {
  assert.equal(normal(reais(265050)), "R$ 2.650,50");
});

test("o espaço depois do R$ não quebra linha", () => {
  assert.ok(reais(260000).includes(" "));
});
