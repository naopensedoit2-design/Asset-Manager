import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { isValidSignature, signBody } from "./signature.ts";
import { canonicalPhone, formatPhone, phoneVariants, samePhone } from "./phone.ts";
import { parseWebhook } from "./parse.ts";
import { buttonTitle, isAffirmative, isNegative, isTrivial, oneLine, splitText, toWhatsApp } from "./format.ts";
import { buildHistory, describe } from "./history.ts";

// ─── Assinatura ──────────────────────────────────────────────

test("assinatura da Meta: aceita só o corpo exato com o segredo certo", () => {
  const body = '{"object":"whatsapp_business_account","entry":[{"id":"1","changes":[]}],"t":"Ol\\u00e1"}';
  const header = `sha256=${createHmac("sha256", "segredo").update(body).digest("hex")}`;
  assert.equal(signBody(body, "segredo"), header);
  assert.equal(isValidSignature(body, header, "segredo"), true);
  assert.equal(isValidSignature(Buffer.from(body), header.toUpperCase().replace("SHA256", "sha256"), "segredo"), true);
  assert.equal(isValidSignature(body + " ", header, "segredo"), false);
  assert.equal(isValidSignature(body, header, "outro"), false);
  assert.equal(isValidSignature(body, null, "segredo"), false);
  assert.equal(isValidSignature(body, header, ""), false);
  assert.equal(isValidSignature(body, "sha256=abc", "segredo"), false);
});

// ─── Telefones ───────────────────────────────────────────────

test("números brasileiros com e sem o nono dígito são a mesma pessoa", () => {
  assert.deepEqual(phoneVariants("+55 (51) 98888-7777").sort(), ["5551988887777", "555188887777"].sort());
  assert.deepEqual(phoneVariants("555188887777").sort(), ["5551988887777", "555188887777"].sort());
  assert.deepEqual(phoneVariants("51988887777").sort(), ["5551988887777", "555188887777"].sort());
  // Fixo (começa com 3) não ganha o 9
  assert.deepEqual(phoneVariants("555433334444"), ["555433334444"]);
  // Estrangeiro fica como está
  assert.deepEqual(phoneVariants("+1 650 555 1234"), ["16505551234"]);
  assert.equal(samePhone("555188887777", "(51) 98888-7777"), true);
  assert.equal(samePhone("5551988887777", "5551977776666"), false);
  assert.equal(samePhone("", "5551988887777"), false);
  assert.equal(canonicalPhone("555188887777"), "5551988887777");
  assert.equal(canonicalPhone("5551977776666"), "5551977776666");
  assert.equal(formatPhone("5551977776666"), "+55 (51) 97777-6666");
  assert.equal(formatPhone("555433334444"), "+55 (54) 3333-4444");
});

// ─── Webhook ─────────────────────────────────────────────────

function payload(messages: unknown[], extra: Record<string, unknown> = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "5551977776666", phone_number_id: "PNID" },
              contacts: [{ profile: { name: "Ana" }, wa_id: "555481112222" }],
              messages,
              ...extra,
            },
          },
        ],
      },
    ],
  };
}

test("webhook: texto, áudio, imagem, documento, botão, localização e reação", () => {
  const base = { from: "555481112222", timestamp: "1760000000" };
  const parsed = parseWebhook(
    payload([
      { ...base, id: "w1", type: "text", text: { body: "Olá! Quero o carro em 05/12" } },
      { ...base, id: "w2", type: "audio", audio: { id: "m2", mime_type: "audio/ogg; codecs=opus", voice: true } },
      { ...base, id: "w3", type: "image", image: { id: "m3", mime_type: "image/jpeg", caption: "comprovante" } },
      { ...base, id: "w4", type: "document", document: { id: "m4", mime_type: "application/pdf", filename: "pix.pdf" } },
      { ...base, id: "w5", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "ok:12", title: "Confirmar" } } },
      { ...base, id: "w6", type: "location", location: { latitude: -29.37, longitude: -50.87, name: "Villa Bella", address: "Gramado" } },
      { ...base, id: "w7", type: "reaction", reaction: { message_id: "w1", emoji: "❤️" } },
      { ...base, id: "w8", type: "button", button: { text: "Ver agora", payload: "ver" } },
      { ...base, id: "w9", type: "unsupported", errors: [{ code: 131051, title: "Message type unknown" }] },
      { from: "", id: "w10", type: "text", text: { body: "sem remetente" } },
    ]),
  );
  assert.equal(parsed.messages.length, 9);
  const [t, a, i, d, b, l, r, tb, u] = parsed.messages;
  assert.equal(t.text, "Olá! Quero o carro em 05/12");
  assert.equal(t.profileName, "Ana");
  assert.equal(t.phoneNumberId, "PNID");
  assert.equal(t.timestamp, 1_760_000_000_000);
  assert.equal(a.isVoice, true);
  assert.equal(a.mediaId, "m2");
  assert.equal(i.text, "comprovante");
  assert.equal(i.mediaMime, "image/jpeg");
  assert.equal(d.fileName, "pix.pdf");
  assert.equal(b.buttonId, "ok:12");
  assert.equal(b.text, "Confirmar");
  assert.match(l.text, /Villa Bella, Gramado \(-29.37, -50.87\)/);
  assert.equal(r.reactionTo, "w1");
  assert.equal(r.text, "❤️");
  assert.equal(tb.buttonId, "ver");
  assert.equal(tb.text, "Ver agora");
  assert.equal(u.text, "Message type unknown");
});

test("webhook: status de entrega e falha; outros objetos são ignorados", () => {
  const parsed = parseWebhook(
    payload([], {
      statuses: [
        { id: "o1", status: "delivered", recipient_id: "555481112222", timestamp: "1760000100" },
        { id: "o2", status: "failed", recipient_id: "555481112222", timestamp: "1760000200", errors: [{ code: 131047, title: "Re-engagement message" }] },
      ],
    }),
  );
  assert.equal(parsed.messages.length, 0);
  assert.deepEqual(
    parsed.statuses.map((x) => [x.wamid, x.status, x.errorCode]),
    [
      ["o1", "delivered", null],
      ["o2", "failed", 131047],
    ],
  );
  assert.deepEqual(parseWebhook({ object: "page", entry: [] }), { messages: [], statuses: [] });
  assert.deepEqual(parseWebhook(null), { messages: [], statuses: [] });
  assert.deepEqual(parseWebhook("lixo"), { messages: [], statuses: [] });
});

// ─── Formatação ──────────────────────────────────────────────

test("markdown vira formatação do WhatsApp", () => {
  assert.equal(toWhatsApp("**Total:** R$ 3.100,00"), "*Total:* R$ 3.100,00");
  assert.equal(toWhatsApp("## Orçamento\n- Carro da Noiva\n- Saída"), "*Orçamento*\n• Carro da Noiva\n• Saída");
  assert.equal(toWhatsApp("Veja [a proposta](https://x.com/p/abc)"), "Veja a proposta: https://x.com/p/abc");
  assert.equal(toWhatsApp("a\n\n\n\nb"), "a\n\nb");
});

test("parâmetro de modelo fica numa linha só e dentro do limite", () => {
  assert.equal(oneLine("Novo pedido\nAna · 05/12\n\n\tR$  3.100"), "Novo pedido · Ana · 05/12 · R$ 3.100");
  assert.equal(oneLine("x".repeat(50), 10), "xxxxxxxxx…");
  assert.equal(oneLine("\n  oi  \n"), "oi");
});

test("textos longos são divididos sem cortar palavras", () => {
  const parts = splitText(`${"palavra ".repeat(700)}\n\nfim`, 1000);
  assert.ok(parts.length > 1);
  assert.ok(parts.every((p) => p.length <= 1000));
  assert.equal(parts.join(" ").replace(/\s+/g, " "), `${"palavra ".repeat(700)}fim`.replace(/\s+/g, " "));
  assert.deepEqual(splitText("curto"), ["curto"]);
});

test("respostas curtas de confirmação", () => {
  for (const yes of ["Sim", "sim!", "Pode", "pode sim", "Confirmo.", "ok", "👍", "Isso mesmo"]) assert.equal(isAffirmative(yes), true, yes);
  for (const notYes of ["sim, mas muda o valor", "pode ser amanhã?", "não", "simples"]) assert.equal(isAffirmative(notYes), false, notYes);
  for (const no of ["Não", "nao", "cancela", "Agora não"]) assert.equal(isNegative(no), true, no);
  assert.equal(isNegative("não sei"), false);
  assert.equal(isTrivial("Oi, Margot!"), true);
  assert.equal(isTrivial("bom dia"), true);
  assert.equal(isTrivial("quanto entrou esse mês?"), false);
  assert.equal(buttonTitle("Confirmar o sinal da Ana agora"), "Confirmar o sinal d…");
});

// ─── Histórico ───────────────────────────────────────────────

test("histórico alterna os papéis, começa pelo cliente e marca o Leonardo", () => {
  const m = (id: number, direction: string, author: string, text: string, extra: Record<string, string> = {}) => ({
    id,
    direction,
    author,
    type: "text",
    text,
    fileName: "",
    status: direction === "in" ? "recebida" : "enviada",
    ...extra,
  });
  const turns = buildHistory([
    m(1, "out", "sistema", "mensagem antiga da empresa"),
    m(2, "in", "cliente", "Oi"),
    m(3, "in", "cliente", "Quero orçamento"),
    m(4, "out", "margot", "Claro! Qual a data?"),
    m(5, "out", "margot", "falhou", { status: "falhou" }),
    m(6, "in", "cliente", "", { type: "audio", text: "dia 5 de dezembro" }),
    m(7, "out", "leonardo", "Oi Ana, aqui é o Leonardo"),
    m(8, "in", "cliente", "", { type: "reaction", text: "❤️" }),
    m(9, "in", "cliente", "comprovante", { type: "image" }),
  ]);
  assert.deepEqual(turns, [
    { role: "user", content: "Oi\nQuero orçamento" },
    { role: "assistant", content: "Claro! Qual a data?" },
    { role: "user", content: "[áudio] dia 5 de dezembro" },
    { role: "assistant", content: "[Leonardo escreveu pessoalmente] Oi Ana, aqui é o Leonardo" },
    { role: "user", content: "[imagem] comprovante" },
  ]);
  assert.equal(describe({ id: 1, direction: "in", author: "cliente", type: "document", text: "", fileName: "pix.pdf", status: "" }), "[documento: pix.pdf]");
  assert.equal(describe({ id: 1, direction: "in", author: "cliente", type: "audio", text: "", fileName: "", status: "" }), "[áudio que não consegui ouvir]");
});

test("histórico longo guarda só o final", () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    direction: i % 2 === 0 ? "in" : "out",
    author: i % 2 === 0 ? "cliente" : "margot",
    type: "text",
    text: `mensagem ${i} ${"x".repeat(200)}`,
    fileName: "",
    status: "",
  }));
  const turns = buildHistory(rows, { maxTurns: 10, maxChars: 1500 });
  assert.ok(turns.length <= 10);
  assert.equal(turns[0].role, "user");
  assert.ok(turns.reduce((n, t) => n + t.content.length, 0) <= 1500);
  assert.match(turns[turns.length - 1].content, /mensagem 99/);
});
