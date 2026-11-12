import assert from "node:assert/strict";
import { test } from "node:test";
import { CHAT_URL, MENSAGEM_WHATSAPP, WHATSAPP_HREF } from "./links.ts";

test("os botões apontam para rotas do próprio site, sem número no endereço", () => {
  assert.equal(WHATSAPP_HREF, "/whatsapp");
  assert.equal(CHAT_URL, "/orcamento/detalhado");
  assert.doesNotMatch(WHATSAPP_HREF + CHAT_URL, /\d/);
});

test("a mensagem pronta pede data, local e serviço, cada um numa linha", () => {
  const linhas = MENSAGEM_WHATSAPP.split("\n");
  assert.ok(linhas.includes("Data:"));
  assert.ok(linhas.includes("Cidade ou local:"));
  assert.ok(linhas.some((l) => l.startsWith("Serviço")));
});

test("a mensagem não promete nada nem leva número", () => {
  assert.doesNotMatch(MENSAGEM_WHATSAPP, /\d/);
  assert.doesNotMatch(MENSAGEM_WHATSAPP, /exclusiv|garant|bloque/i);
});
