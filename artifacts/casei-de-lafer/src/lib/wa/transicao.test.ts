import { test } from "node:test";
import assert from "node:assert/strict";
import { erroTransicao } from "./pedido.ts";

const base = { pedido: 6, de: "Realizado", para: "Cancelado", possiveis: [] as string[], paraCancelar: true };

test("pedido realizado duplicado: aponta excluir_pedido em vez do painel", () => {
  const t = erroTransicao({ ...base, podeExcluir: true, duplicadoDe: 5 });
  assert.match(t, /Possíveis: nenhum/);
  assert.match(t, /duplicado comprovado do #5/);
  assert.match(t, /excluir_pedido com o número 6/);
});

test("sem pagamento: também aponta excluir_pedido", () => {
  const t = erroTransicao({ ...base, podeExcluir: true });
  assert.match(t, /não tem pagamento recebido/);
});

test("não pode excluir: só a transição, sem sugerir exclusão", () => {
  const t = erroTransicao({ ...base, podeExcluir: false, duplicadoDe: 5 });
  assert.doesNotMatch(t, /excluir_pedido/);
});

test("mudança que não é cancelar/perder não sugere exclusão", () => {
  const t = erroTransicao({ ...base, para: "Confirmado", paraCancelar: false, podeExcluir: true, possiveis: ["Reaberto"] });
  assert.doesNotMatch(t, /excluir_pedido/);
  assert.match(t, /Possíveis: Reaberto\./);
});
