import { test } from "node:test";
import assert from "node:assert/strict";
import {
  firstContactReason,
  ignoreExplanation,
  ignoreLabel,
  isAutoIgnored,
  looksLikeLead,
  triageInbound,
  type ContactState,
  type TriageMessage,
} from "./triage.ts";

const msg = (m: Partial<TriageMessage> = {}): TriageMessage => ({ type: "text", text: "", forwarded: false, ...m });
const state = (s: Partial<ContactState> = {}): ContactState => ({ isNew: true, isOwner: false, isClient: false, ignored: false, reason: "", ...s });

// ─── Quem fala de contratar ──────────────────────────────────

test("looksLikeLead: casamento, carro e valor, com ou sem acento e em qualquer caixa", () => {
  for (const text of [
    "Oi! Vi o carro de vocês no Instagram",
    "ORÇAMENTO para 12/12",
    "Queremos o carro para o nosso Casamento",
    "pré-wedding em Gramado",
    "prewedding",
    "Quanto custa?",
    "qual o preço?",
    "Vocês tem disponibilidade em março?",
    "quero reservar a data",
    "Sou a noiva",
  ]) {
    assert.equal(looksLikeLead(text), true, text);
  }
});

test("looksLikeLead: corrente e bom-dia não contam", () => {
  for (const text of ["", "Bom dia! Que Deus abençoe a todos 🙏", "Compartilhe com 10 amigos", "Preserve a sua saúde", "Feliz aniversário"]) {
    assert.equal(looksLikeLead(text), false, text);
  }
});

// ─── Primeiro contato ────────────────────────────────────────

test("firstContactReason: encaminhada, figurinha, vídeo, contato e localização parecem mensagem em massa", () => {
  assert.equal(firstContactReason(msg({ forwarded: true, text: "Bom dia!" })), "encaminhada");
  assert.equal(firstContactReason(msg({ forwarded: true, type: "video" })), "encaminhada");
  assert.equal(firstContactReason(msg({ type: "sticker" })), "figurinha");
  assert.equal(firstContactReason(msg({ type: "video" })), "video");
  assert.equal(firstContactReason(msg({ type: "contacts", text: "Ana: +55 51 99999-0000" })), "contato");
  assert.equal(firstContactReason(msg({ type: "location", text: "Gramado (-29.3, -50.8)" })), "localizacao");
});

test("firstContactReason: encaminhada vale mesmo falando de casamento (propaganda de outro fornecedor)", () => {
  assert.equal(firstContactReason(msg({ forwarded: true, text: "Carro para casamento, ligue já!" })), "encaminhada");
});

test("firstContactReason: texto, áudio, foto, documento e botão começam conversa de verdade", () => {
  for (const type of ["text", "audio", "image", "document", "interactive", "button", "reaction"]) {
    assert.equal(firstContactReason(msg({ type, text: "Bom dia!" })), null, type);
  }
});

test("firstContactReason: vídeo ou figurinha com legenda de casamento, carro ou valor não é ignorado", () => {
  assert.equal(firstContactReason(msg({ type: "video", text: "Quero esse carro no meu casamento" })), null);
  assert.equal(firstContactReason(msg({ type: "sticker", text: "orçamento" })), null);
  assert.equal(firstContactReason(msg({ type: "video", text: "Bom dia, grupo!" })), "video");
});

// ─── Decisão por mensagem ────────────────────────────────────

test("triageInbound: número novo que começa com vídeo passa a ser ignorado", () => {
  assert.deepEqual(triageInbound(state(), msg({ type: "video" })), { ignored: true, reason: "video", change: "ignorar" });
  assert.deepEqual(triageInbound(state(), msg({ forwarded: true })), { ignored: true, reason: "encaminhada", change: "ignorar" });
});

test("triageInbound: texto de um número novo é atendido normalmente", () => {
  assert.deepEqual(triageInbound(state(), msg({ text: "Oi, boa tarde" })), { ignored: false, reason: "", change: null });
});

test("triageInbound: só o primeiro contato é triado (quem já conversou não vira ignorado por mandar vídeo)", () => {
  assert.deepEqual(triageInbound(state({ isNew: false }), msg({ type: "video" })), { ignored: false, reason: "", change: null });
  assert.deepEqual(triageInbound(state({ isNew: false }), msg({ forwarded: true })), { ignored: false, reason: "", change: null });
});

test("triageInbound: cliente do painel nunca é ignorado sozinho", () => {
  assert.deepEqual(triageInbound(state({ isClient: true }), msg({ type: "video" })), { ignored: false, reason: "", change: null });
  assert.deepEqual(triageInbound(state({ isClient: true }), msg({ forwarded: true })), { ignored: false, reason: "", change: null });
});

test("triageInbound: o dono nunca é ignorado, e o número dele volta se estava ignorado", () => {
  assert.deepEqual(triageInbound(state({ isOwner: true }), msg({ type: "video" })), { ignored: false, reason: "", change: null });
  assert.deepEqual(triageInbound(state({ isOwner: true, isNew: false, ignored: true, reason: "video" }), msg()), {
    ignored: false,
    reason: "",
    change: "reativar",
  });
  assert.deepEqual(triageInbound(state({ isOwner: true, isNew: false, ignored: true, reason: "manual" }), msg()), {
    ignored: false,
    reason: "",
    change: "reativar",
  });
});

test("triageInbound: ignorada pelo dono continua ignorada, mesmo que a pessoa fale de casamento", () => {
  const s = state({ isNew: false, ignored: true, reason: "manual" });
  assert.deepEqual(triageInbound(s, msg({ text: "Quero um orçamento de casamento" })), { ignored: true, reason: "manual", change: null });
});

test("triageInbound: motivo vazio em conversa ignorada conta como decisão do dono", () => {
  const s = state({ isNew: false, ignored: true, reason: "" });
  assert.deepEqual(triageInbound(s, msg({ text: "Quero um orçamento" })), { ignored: true, reason: "manual", change: null });
});

test("triageInbound: ignorada pela triagem volta quando a pessoa escreve sobre casamento, carro ou valor", () => {
  const s = state({ isNew: false, ignored: true, reason: "video" });
  assert.deepEqual(triageInbound(s, msg({ text: "Oi! Quanto custa o carro para casamento?" })), { ignored: false, reason: "", change: "reativar" });
  // legenda de foto ou de vídeo também conta
  assert.deepEqual(triageInbound(s, msg({ type: "image", text: "Esse é o local do casamento" })), { ignored: false, reason: "", change: "reativar" });
});

test("triageInbound: ignorada pela triagem continua ignorada com bom-dia, vídeo ou encaminhada", () => {
  const s = state({ isNew: false, ignored: true, reason: "encaminhada" });
  const stay = { ignored: true, reason: "encaminhada", change: null };
  assert.deepEqual(triageInbound(s, msg({ text: "Bom dia! 🙏" })), stay);
  assert.deepEqual(triageInbound(s, msg({ type: "video" })), stay);
  // propaganda de casamento encaminhada não reativa
  assert.deepEqual(triageInbound(s, msg({ forwarded: true, text: "Carro de casamento, valor especial" })), stay);
});

// ─── Rótulos ─────────────────────────────────────────────────

test("ignoreExplanation: à mão fala de você; sozinha explica o motivo e que ela volta", () => {
  assert.match(ignoreExplanation("manual"), /^Você ignorou esta conversa\./);
  assert.match(ignoreExplanation(""), /^Você ignorou esta conversa\./);
  assert.match(ignoreExplanation("video"), /^Ignorada sozinha: começou com vídeo\. .*volta sozinha\.$/);
  assert.match(ignoreExplanation("encaminhada"), /começou com mensagem encaminhada/);
});

test("ignoreLabel e isAutoIgnored", () => {
  assert.equal(ignoreLabel("manual"), "Ignorada por você");
  assert.equal(ignoreLabel("video"), "Começou com vídeo");
  assert.equal(ignoreLabel("encaminhada"), "Começou com mensagem encaminhada");
  assert.equal(ignoreLabel(""), "Ignorada por você");
  assert.equal(ignoreLabel("coisa-nova"), "Ignorada por você");
  assert.equal(isAutoIgnored("manual"), false);
  assert.equal(isAutoIgnored(""), false);
  assert.equal(isAutoIgnored("figurinha"), true);
});

test("triageInbound: número novo que começa com mensagem que o WhatsApp não entrega fica em silêncio", () => {
  assert.equal(firstContactReason(msg({ type: "unsupported" })), "nao_entregue");
  assert.deepEqual(triageInbound(state(), msg({ type: "unsupported" })), { ignored: true, reason: "nao_entregue", change: "ignorar" });
  // Cliente do painel e quem já conversou continuam recebendo o pedido de reenvio.
  assert.deepEqual(triageInbound(state({ isClient: true }), msg({ type: "unsupported" })), { ignored: false, reason: "", change: null });
  assert.deepEqual(triageInbound(state({ isNew: false }), msg({ type: "unsupported" })), { ignored: false, reason: "", change: null });
});

test("triageInbound: silêncio por mensagem não entregue acaba com qualquer texto, áudio, foto ou documento", () => {
  const s = state({ isNew: false, ignored: true, reason: "nao_entregue" });
  for (const type of ["text", "audio", "image", "document"]) {
    assert.deepEqual(triageInbound(s, msg({ type, text: "Oi" })), { ignored: false, reason: "", change: "reativar" }, type);
  }
  assert.deepEqual(triageInbound(s, msg({ type: "unsupported" })), { ignored: true, reason: "nao_entregue", change: null });
  assert.deepEqual(triageInbound(s, msg({ type: "sticker" })), { ignored: true, reason: "nao_entregue", change: null });
  assert.deepEqual(triageInbound(s, msg({ forwarded: true, text: "Oi" })), { ignored: true, reason: "nao_entregue", change: null });
});
