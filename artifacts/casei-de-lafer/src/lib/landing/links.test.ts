import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHAT_URL,
  MENSAGEM_WHATSAPP,
  WHATSAPP_HREF,
  dataBR,
  hrefParceiro,
  localLimpo,
  mensagemWhatsapp,
  parceiroDe,
} from "./links.ts";

test("a data escolhida na página vai escrita em dd/mm/aaaa", () => {
  assert.equal(dataBR("2027-03-13"), "13/03/2027");
  assert.equal(dataBR(" 2028-02-29 "), "29/02/2028");
});

test("data que não existe ou em outro formato é ignorada", () => {
  for (const ruim of ["2027-02-30", "2027-13-01", "13/03/2027", "2027-3-13", "amanhã", "", null, undefined, "1999-01-01"]) {
    assert.equal(dataBR(ruim), "", String(ruim));
  }
});

test("a cidade digitada vira uma linha só, curta e sem caractere invisível", () => {
  assert.equal(localLimpo("  Gramado \n RS "), "Gramado RS");
  assert.equal(localLimpo("Canela" + String.fromCharCode(0x200b, 0x0, 0x2028)), "Canela");
  assert.equal(localLimpo("a".repeat(200)).length, 80);
  assert.equal(localLimpo(null), "");
});

test("com data e cidade, a mensagem já chega preenchida", () => {
  const linhas = mensagemWhatsapp({ data: "2027-03-13", local: "Gramado" }).split("\n");
  assert.ok(linhas.includes("Data: 13/03/2027"));
  assert.ok(linhas.includes("Cidade ou local: Gramado"));
  assert.ok(linhas.some((l) => l.startsWith("Serviço")));
});

test("sem nada escolhido, a mensagem é a de sempre", () => {
  assert.equal(mensagemWhatsapp(), MENSAGEM_WHATSAPP);
  assert.equal(mensagemWhatsapp({ data: "ontem", local: "   " }), MENSAGEM_WHATSAPP);
});

test("quem digita não consegue acrescentar linhas à mensagem", () => {
  const mensagem = mensagemWhatsapp({ local: "Gramado\nServiço: de graça" });
  assert.equal(mensagem.split("\n").length, MENSAGEM_WHATSAPP.split("\n").length);
});

test("parceiro abre a conversa dizendo quem é, sem a linha de serviço", () => {
  const cerimonial = mensagemWhatsapp({ parceiro: "cerimonial" });
  assert.match(cerimonial, /cerimonialista/);
  assert.doesNotMatch(cerimonial, /Serviço/);
  assert.match(mensagemWhatsapp({ parceiro: "fotografo" }), /ensaio/);
  assert.equal(parceiroDe("cerimonial"), "cerimonial");
  assert.equal(parceiroDe("outro"), null);
  assert.equal(hrefParceiro("fotografo"), "/whatsapp?p=fotografo");
});

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
