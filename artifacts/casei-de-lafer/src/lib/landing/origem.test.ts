import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { BOTOES } from "./links.ts";
import { BOTOES_CONHECIDOS, codigoDaConversa, MAX_CODIGO, origemDaConversa } from "./origem.ts";

test("a lista de botões do chat é a da página mais 'outro'", () => {
  assert.deepEqual([...BOTOES, "outro"], [...BOTOES_CONHECIDOS]);
});

test("botão e campanha do endereço viram o começo do código da conversa", () => {
  assert.equal(origemDaConversa("?b=topo&c=meta-casamento"), "topo.meta-casamento.");
  assert.equal(origemDaConversa("?b=valores"), "valores.sem-campanha.");
  assert.equal(origemDaConversa("?b=rodape&c="), "rodape.sem-campanha.");
});

test("sem botão no endereço, a conversa não ganha origem", () => {
  assert.equal(origemDaConversa(""), "");
  assert.equal(origemDaConversa("?c=meta"), "");
});

test("botão desconhecido vira 'outro' e a campanha só guarda letras, números, - e _", () => {
  assert.equal(origemDaConversa("?b=qualquer-coisa"), "outro.sem-campanha.");
  assert.equal(origemDaConversa("?b=final&c=Meta Casamento!!"), "final.metacasamento.");
  assert.equal(origemDaConversa("?b=final&c=%3Cscript%3E"), "final.script.");
});

test("o código nunca passa dos 64 caracteres que o banco guarda", () => {
  const uuid = randomUUID();
  const pior = codigoDaConversa(`?b=valores&c=${"a".repeat(40)}`, uuid);
  assert.equal(pior.length, 63);
  assert.ok(pior.endsWith(uuid));
  assert.ok(codigoDaConversa(`?b=valores&c=${"a".repeat(40)}`, "x".repeat(80)).length <= MAX_CODIGO);
  assert.equal(codigoDaConversa("", uuid), uuid);
});

test("o código é separável por ponto: botão, campanha, uuid", () => {
  const uuid = randomUUID();
  const partes = codigoDaConversa("?b=topo&c=meta-casamento", uuid).split(".");
  assert.deepEqual(partes, ["topo", "meta-casamento", uuid]);
});
