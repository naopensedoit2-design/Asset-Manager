import { test } from "node:test";
import assert from "node:assert/strict";
import { conversasLinha, resumoParte, SILENT_TYPES } from "./resumo.ts";

test("linha de conversas do resumo", () => {
  assert.equal(conversasLinha({ escreveram: 0, esperando: 0 }), "*Conversas (24 h):* nenhum cliente escreveu.");
  assert.equal(conversasLinha({ escreveram: 1, esperando: 0 }), "*Conversas (24 h):* 1 cliente escreveu · 1 respondida");
  assert.equal(conversasLinha({ escreveram: 4, esperando: 1 }), "*Conversas (24 h):* 4 clientes escreveram · 3 respondidas · 1 esperando resposta");
});

test("resumo sem nada pendente ainda é mandado, com texto claro", () => {
  assert.equal(resumoParte([]), "resumo do dia: nada pendente");
  assert.equal(resumoParte(["1 alerta", "2 conversas esperando"]), "resumo do dia: 1 alerta, 2 conversas esperando");
});

test("aviso de sistema do WhatsApp não conta como conversa esperando", () => {
  assert.ok(SILENT_TYPES.includes("system"));
  assert.ok(SILENT_TYPES.includes("reaction"));
  assert.ok(!SILENT_TYPES.includes("text"));
  assert.ok(!SILENT_TYPES.includes("unsupported"));
});
