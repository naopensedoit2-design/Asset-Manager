import { test } from "node:test";
import assert from "node:assert/strict";
import { disposition, downloadName, mediaCsp } from "./media-file.ts";

test("disposition: sem nome é só inline ou attachment", () => {
  assert.equal(disposition("inline", ""), "inline");
  assert.equal(disposition("attachment", ""), "attachment");
});

test("disposition: nome com espaço, acento e emoji não quebra o cabeçalho", () => {
  assert.equal(
    disposition("inline", "Convite casamento.pdf"),
    "inline; filename=\"Convite casamento.pdf\"; filename*=UTF-8''Convite%20casamento.pdf",
  );
  const h = disposition("attachment", "Orçamento ✨ \"final\".pdf");
  assert.match(h, /^attachment; filename="Or_amento _ _final_\.pdf"; filename\*=UTF-8''/);
  assert.match(h, /Or%C3%A7amento%20%E2%9C%A8%20%22final%22\.pdf$/);
  // o cabeçalho inteiro só tem caracteres que o HTTP aceita
  assert.match(h, /^[\x20-\x7e]+$/);
});

test("downloadName: usa o nome que a pessoa mandou; sem nome, monta um pela extensão", () => {
  assert.equal(downloadName("Contrato.pdf", "application/pdf", "m1"), "Contrato.pdf");
  assert.equal(downloadName("  ", "video/mp4", "wamid123"), "midia-wamid123.mp4");
  assert.equal(downloadName("", "audio/ogg; codecs=opus", "a-1"), "midia-a-1.ogg");
  assert.equal(downloadName("", "VIDEO/WEBM", "v"), "midia-v.webm");
  assert.equal(downloadName("", "application/x-coisa", "x9"), "midia-x9");
});

test("downloadName: o id nunca vira caminho nem caractere estranho", () => {
  assert.equal(downloadName("", "video/mp4", "../../etc/passwd"), "midia-etcpasswd.mp4");
  assert.equal(downloadName("", "video/mp4", "///"), "midia-arquivo.mp4");
  assert.ok(downloadName("", "video/mp4", "a".repeat(200)).length <= "midia-".length + 24 + ".mp4".length);
});

test("mediaCsp: nada executa, mas foto, vídeo e áudio abrem sozinhos numa aba", () => {
  const csp = mediaCsp("video/mp4") ?? "";
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /media-src 'self'/);
  assert.match(csp, /img-src 'self'/);
  assert.match(csp, /sandbox allow-same-origin$/);
  // sem allow-scripts: a página aberta nunca roda script, mesmo com a própria origem
  assert.doesNotMatch(csp, /allow-scripts|allow-forms|allow-popups|allow-top-navigation/);
  assert.doesNotMatch(csp, /script-src|unsafe-eval|connect-src|frame-src/);
  assert.equal(mediaCsp("image/jpeg"), csp);
});

test("mediaCsp: PDF fica sem a regra (o visualizador do Chrome não abre com ela)", () => {
  assert.equal(mediaCsp("application/pdf"), null);
});
