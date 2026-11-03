import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chatFlow,
  dayKeyBR,
  initials,
  mapsUrl,
  noticeText,
  parseContacts,
  parseLocation,
  previewBody,
  previewWho,
  telUrl,
  viewKind,
} from "./view.ts";

const msg = (over: Record<string, string> = {}) => ({ type: "text", mediaId: "", mediaMime: "", ...over });

test("viewKind: cada tipo de mensagem tem um desenho", () => {
  assert.equal(viewKind(msg()), "text");
  assert.equal(viewKind(msg({ type: "interactive" })), "text");
  assert.equal(viewKind(msg({ type: "image", mediaId: "m1", mediaMime: "image/jpeg" })), "image");
  assert.equal(viewKind(msg({ type: "video", mediaId: "m2", mediaMime: "video/mp4" })), "video");
  assert.equal(viewKind(msg({ type: "audio", mediaId: "m3", mediaMime: "audio/ogg; codecs=opus" })), "audio");
  assert.equal(viewKind(msg({ type: "sticker", mediaId: "m4", mediaMime: "image/webp" })), "sticker");
  assert.equal(viewKind(msg({ type: "document", mediaId: "m5", mediaMime: "application/pdf" })), "document");
  assert.equal(viewKind(msg({ type: "location" })), "location");
  assert.equal(viewKind(msg({ type: "contacts" })), "contacts");
  assert.equal(viewKind(msg({ type: "reaction" })), "reaction");
});

test("viewKind: aviso com foto (comprovante com botões) é decidido pelo arquivo", () => {
  assert.equal(viewKind(msg({ type: "interactive", mediaId: "c1", mediaMime: "image/jpeg" })), "image");
  assert.equal(viewKind(msg({ type: "interactive", mediaId: "c2", mediaMime: "application/pdf" })), "document");
});

test("viewKind: mídia sem arquivo e tipos sem conteúdo viram aviso, nunca balão vazio", () => {
  assert.equal(viewKind(msg({ type: "video" })), "notice");
  assert.equal(viewKind(msg({ type: "image" })), "notice");
  for (const type of ["unsupported", "unknown", "system", "request_welcome", "order", "ephemeral"]) {
    assert.equal(viewKind(msg({ type })), "notice", type);
  }
});

test("noticeText: sempre em português e nunca vazio", () => {
  assert.match(noticeText("unsupported", "Message type is not currently supported"), /não entrega/);
  assert.doesNotMatch(noticeText("unsupported", "Message type is not currently supported"), /Message type/);
  assert.match(noticeText("video", ""), /indisponível/);
  assert.equal(noticeText("system", "Fulano mudou de número"), "Fulano mudou de número");
  assert.equal(noticeText("system", ""), "Aviso do WhatsApp.");
  assert.match(noticeText("coisa_nova", ""), /coisa_nova/);
});

test("parseLocation lê as coordenadas do texto que o parse.ts guarda", () => {
  assert.deepEqual(parseLocation("Praça Central, Rua das Flores 10 (-29.3788, -50.8742)"), {
    label: "Praça Central, Rua das Flores 10",
    lat: -29.3788,
    lng: -50.8742,
  });
  assert.deepEqual(parseLocation("(-29.5, -51)"), { label: "", lat: -29.5, lng: -51 });
  assert.equal(parseLocation("sem coordenadas"), null);
  assert.equal(parseLocation("fora do mapa (95, 10)"), null);
  assert.equal(mapsUrl(-29.5, -51), "https://www.google.com/maps?q=-29.5,-51");
});

test("parseContacts separa nome e telefones", () => {
  assert.deepEqual(parseContacts("Ana Souza: +55 51 99999-0000, +55 51 3333-0000; Bruno Lima: (51) 98888-1111"), [
    { name: "Ana Souza", phones: ["+55 51 99999-0000", "+55 51 3333-0000"] },
    { name: "Bruno Lima", phones: ["(51) 98888-1111"] },
  ]);
  assert.deepEqual(parseContacts("Só o nome"), [{ name: "Só o nome", phones: [] }]);
  assert.deepEqual(parseContacts(""), []);
  assert.equal(telUrl("+55 (51) 99999-0000"), "tel:+5551999990000");
});

test("prévia da lista: quem escreveu e o tipo do arquivo", () => {
  assert.equal(previewWho({ direction: "in", author: "cliente" }), "");
  assert.equal(previewWho({ direction: "out", author: "leonardo" }), "Você: ");
  assert.equal(previewWho({ direction: "out", author: "margot" }), "Margot: ");
  assert.equal(previewWho({ direction: "out", author: "sistema" }), "Automático: ");
  assert.equal(previewBody({ type: "text", text: "Oi, tudo bem?" }), "Oi, tudo bem?");
  assert.equal(previewBody({ type: "video", text: "" }), "🎬 Vídeo");
  assert.equal(previewBody({ type: "image", text: "o salão" }), "📷 Foto · o salão");
  assert.equal(previewBody({ type: "contacts", text: "" }), "👤 Contato");
  assert.equal(previewBody({ type: "template", text: "Novidade" }), "Novidade");
  assert.equal(previewBody({ type: "algo_novo", text: "" }), "Mensagem");
});

test("iniciais: nome, casal e número de telefone", () => {
  assert.equal(initials("Camila & Rafael"), "CR");
  assert.equal(initials("Bianca"), "B");
  assert.equal(initials("+55 51 99999-0000"), "");
  assert.equal(initials(""), "");
});

test("dayKeyBR usa o dia de Brasília, não o de Greenwich", () => {
  assert.equal(dayKeyBR("2026-11-03T02:30:00Z"), "2026-11-02"); // 23h30 do dia 2 em Brasília
  assert.equal(dayKeyBR("2026-11-03T03:30:00Z"), "2026-11-03");
});

test("chatFlow: rabinho na primeira de cada sequência e separador a cada dia", () => {
  const base = { mediaId: "", mediaMime: "" };
  const list = [
    { id: 1, direction: "in", author: "cliente", type: "text", createdAt: "2026-11-02T13:00:00Z", ...base },
    { id: 2, direction: "in", author: "cliente", type: "text", createdAt: "2026-11-02T13:01:00Z", ...base },
    { id: 3, direction: "out", author: "margot", type: "text", createdAt: "2026-11-02T13:02:00Z", ...base },
    { id: 4, direction: "out", author: "leonardo", type: "text", createdAt: "2026-11-02T13:03:00Z", ...base },
    { id: 5, direction: "out", author: "leonardo", type: "text", createdAt: "2026-11-02T13:04:00Z", ...base },
    { id: 6, direction: "in", author: "cliente", type: "reaction", createdAt: "2026-11-02T13:05:00Z", ...base },
    { id: 7, direction: "in", author: "cliente", type: "text", createdAt: "2026-11-02T13:06:00Z", ...base },
    { id: 8, direction: "in", author: "cliente", type: "text", createdAt: "2026-11-03T13:00:00Z", ...base },
  ];
  const flow = chatFlow(list);
  assert.deepEqual(
    flow.map((f) => [f.m.id, f.newDay, f.first]),
    [
      [1, true, true], // abre a conversa
      [2, false, false], // mesma pessoa em seguida: sem rabinho
      [3, false, true], // a Margot responde
      [4, false, true], // Leonardo escreve (outro autor, mesmo lado)
      [5, false, false],
      [6, false, true], // reação
      [7, false, true], // depois de uma reação (item centralizado) começa sequência nova
      [8, true, true], // dia novo
    ],
  );
});
