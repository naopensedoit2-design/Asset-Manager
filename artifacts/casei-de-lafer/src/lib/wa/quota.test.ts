import { test } from "node:test";
import assert from "node:assert/strict";
import { countByKind, FREE_SERVICE_MESSAGES, monthStart, quotaLevel, quotaReport } from "./quota.ts";

// ─── Cota grátis de mensagens do mês (R19) ───────────────────────────────

test("o mês começa à meia-noite de Brasília no dia 1º", () => {
  assert.equal(monthStart("2026-10-29").toISOString(), "2026-10-01T03:00:00.000Z");
  assert.equal(monthStart("2026-12-01").toISOString(), "2026-12-01T03:00:00.000Z");
  assert.equal(monthStart("2027-01-31").toISOString(), "2027-01-01T03:00:00.000Z");
});

test("conta livres e modelos em separado; lixo conta zero", () => {
  const c = countByKind([
    { type: "text", n: 300 },
    { type: "interactive", n: 40 },
    { type: "image", n: 5 },
    { type: "template", n: 12 },
    { type: "audio", n: Number.NaN },
    { type: "document", n: -3 },
  ]);
  assert.deepEqual(c, { service: 345, templates: 12 });
  assert.deepEqual(countByKind([]), { service: 0, templates: 0 });
});

test("níveis nos limites: 70%, 90% e 100% de 1.000", () => {
  assert.equal(FREE_SERVICE_MESSAGES, 1000);
  assert.equal(quotaLevel(0), "ok");
  assert.equal(quotaLevel(699), "ok");
  assert.equal(quotaLevel(700), "atencao");
  assert.equal(quotaLevel(899), "atencao");
  assert.equal(quotaLevel(900), "perto");
  assert.equal(quotaLevel(999), "perto");
  assert.equal(quotaLevel(1000), "estourou");
  assert.equal(quotaLevel(4321), "estourou");
  assert.equal(quotaLevel(Number.NaN), "ok");
});

test("abaixo de 70% o resumo não ganha linha nenhuma", () => {
  const r = quotaReport({ service: 312, templates: 40 });
  assert.equal(r.level, "ok");
  assert.deepEqual(r.lines, []);
  assert.equal(r.part, "");
});

test("a partir de 70% avisa com o número, a porcentagem e o que fazer", () => {
  const r = quotaReport({ service: 712, templates: 0 });
  assert.equal(r.level, "atencao");
  assert.match(r.lines.join("\n"), /712 de 1\.000 mensagens grátis \(71%\)/);
  assert.match(r.lines.join("\n"), /forma de pagamento/);
  assert.match(r.part, /71% da cota/);
});

test("a partir de 90% o aviso fica mais forte", () => {
  const r = quotaReport({ service: 934, templates: 0 });
  assert.equal(r.level, "perto");
  assert.match(r.lines[0], /^🚨 /);
  assert.match(r.lines.join("\n"), /934 de 1\.000/);
  assert.match(r.lines.join("\n"), /antes de passar de 1\.000/);
});

test("acima de 1.000: diz que cada mensagem a mais é cobrada e que sem cartão não é entregue", () => {
  const r = quotaReport({ service: 1203, templates: 0 });
  assert.equal(r.level, "estourou");
  assert.match(r.lines.join("\n"), /1\.203 mensagens, acima das 1\.000 grátis/);
  assert.match(r.lines.join("\n"), /não é entregue/);
  assert.match(r.part, /acima da cota/);
});

test("os modelos entram no aviso só quando há aviso e há modelos", () => {
  assert.match(quotaReport({ service: 800, templates: 7 }).lines.join("\n"), /Modelos enviados no mês: 7 \(cada um é cobrado\)/);
  assert.doesNotMatch(quotaReport({ service: 800, templates: 0 }).lines.join("\n"), /Modelos/);
  assert.deepEqual(quotaReport({ service: 100, templates: 7 }).lines, []);
});
