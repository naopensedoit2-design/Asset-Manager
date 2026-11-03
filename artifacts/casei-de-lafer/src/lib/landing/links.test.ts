import assert from "node:assert/strict";
import { test } from "node:test";
import { acoes, botaoDe, campanhaDoReferer, campanhaReal, hrefChat, hrefWhatsapp } from "./links.ts";

const AMBOS = { chat: true, whatsapp: true };

test("botão desconhecido vira 'outro'", () => {
  assert.equal(botaoDe("topo"), "topo");
  assert.equal(botaoDe("final"), "final");
  assert.equal(botaoDe("x"), "outro");
  assert.equal(botaoDe(null), "outro");
});

test("principal = chat: o WhatsApp vira o link em texto", () => {
  const a = acoes("topo", AMBOS, "chat");
  assert.deepEqual(a.principal, { tipo: "chat", href: "/conversar?b=topo" });
  assert.deepEqual(a.secundaria, { tipo: "whatsapp", href: "/whatsapp?b=topo" });
  assert.equal(hrefChat("final"), "/conversar?b=final");
  assert.equal(hrefWhatsapp("topo"), "/whatsapp?b=topo");
});

test("principal = whatsapp: o chat vira o link em texto", () => {
  const a = acoes("final", AMBOS, "whatsapp");
  assert.deepEqual(a.principal, { tipo: "whatsapp", href: "/whatsapp?b=final" });
  assert.deepEqual(a.secundaria, { tipo: "chat", href: "/conversar?b=final" });
});

test("sem número de WhatsApp, o chat é a única ação, qualquer que seja a principal", () => {
  for (const p of ["chat", "whatsapp"] as const) {
    const a = acoes("valores", { chat: true, whatsapp: false }, p);
    assert.equal(a.principal?.tipo, "chat");
    assert.equal(a.secundaria, null);
  }
});

test("chat desligado, sem chave ou acima do limite: o WhatsApp assume a ação grande", () => {
  for (const p of ["chat", "whatsapp"] as const) {
    const a = acoes("topo", { chat: false, whatsapp: true }, p);
    assert.deepEqual(a.principal, { tipo: "whatsapp", href: "/whatsapp?b=topo" });
    assert.equal(a.secundaria, null);
  }
});

test("sem nenhum canal não há botão (a página mostra um aviso)", () => {
  const a = acoes("topo", { chat: false, whatsapp: false });
  assert.equal(a.principal, null);
  assert.equal(a.secundaria, null);
});

test("campanha do anúncio vem do endereço de origem", () => {
  assert.equal(
    campanhaDoReferer("https://www.eucaseidelafer.com/?utm_source=instagram&utm_medium=paid&utm_campaign=Teste-2-Datas&utm_content=video3"),
    "teste-2-datas",
  );
  assert.equal(campanhaDoReferer("https://www.eucaseidelafer.com/"), "sem-campanha");
  assert.equal(campanhaDoReferer("https://www.eucaseidelafer.com/?utm_campaign=a%20b%3Cscript%3E"), "sem-campanha");
  assert.equal(campanhaDoReferer(""), "sem-origem");
  assert.equal(campanhaDoReferer(null), "sem-origem");
  assert.equal(campanhaDoReferer("não é endereço"), "sem-origem");
});

test("só campanha de verdade segue para o chat", () => {
  assert.equal(campanhaReal("teste-2-datas"), true);
  assert.equal(campanhaReal("sem-origem"), false);
  assert.equal(campanhaReal("sem-campanha"), false);
});
