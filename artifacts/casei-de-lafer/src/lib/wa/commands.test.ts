import { test } from "node:test";
import assert from "node:assert/strict";
import { killFailedReply, normalizeCommand, parseKillCommand, planKillCommand } from "./commands.ts";

// ─── Interruptor geral: "pausar Margot" / "retomar Margot" ───────────────

test("normaliza acento, pontuação, emoji e caixa", () => {
  assert.equal(normalizeCommand("  Pausar   Margot! 🛑 "), "pausar margot");
  assert.equal(normalizeCommand("RETOMAR, a Margot."), "retomar a margot");
  assert.equal(normalizeCommand("Já"), "ja");
});

test("reconhece o pedido de pausa, escrito de jeitos diferentes", () => {
  for (const t of [
    "pausar Margot",
    "Pausar a Margot",
    "PAUSAR MARGOT!",
    "pausar",
    "pausar tudo",
    "pausa geral",
    "parar tudo",
    "parar a Margot",
    "desligar Margot",
    "pausar margot por favor",
    "pausar margot 🛑",
    "  pausar   margot  ",
    "Pausar Margot.",
    "pausa margot agora",
  ]) {
    assert.equal(parseKillCommand(t), "pausar", t);
  }
});

test("reconhece o pedido de retomar", () => {
  for (const t of ["retomar Margot", "retomar", "Retomar a Margot", "retomar tudo", "ligar a Margot", "religar Margot", "reativar Margot", "volta Margot", "Retomar a Margot, por favor!"]) {
    assert.equal(parseKillCommand(t), "retomar", t);
  }
});

test("só vale a mensagem inteira: frases com outro assunto vão para a Margot interpretar", () => {
  for (const t of [
    "pausa para o almoço",
    "pausar a Margot com a Ana", // pausa só a conversa da Ana (ferramenta da secretária)
    "pode voltar a atender a Ana",
    "retomar a conversa com a Ana",
    "quanto entrou esse mês?",
    "me manda o resumo do dia",
    "pausar o pedido 14",
    "parar de responder a Ana",
    "pausar pausar", // duas vezes o verbo: não é o comando
    "pausar margot e depois me avisa quando a Ana escrever", // longa demais
  ]) {
    assert.equal(parseKillCommand(t), null, t);
  }
});

test("verbos ambíguos sozinhos não disparam (ligar, parar, voltar)", () => {
  for (const t of ["ligar", "parar", "voltar", "desligar", "religar", "liga", "pare"]) {
    assert.equal(parseKillCommand(t), null, t);
  }
});

test("vazio, sim/não e valores estranhos não são comando", () => {
  for (const t of ["", "   ", "sim", "não", "ok", "🛑", "1"]) assert.equal(parseKillCommand(t), null, JSON.stringify(t));
  assert.equal(parseKillCommand(null as unknown as string), null);
  assert.equal(parseKillCommand(undefined as unknown as string), null);
});

test("pausar desliga as duas chaves (WhatsApp e chat do site), mesmo se só uma estava ligada", () => {
  for (const state of [
    { margotWhatsapp: true, margotSite: true },
    { margotWhatsapp: true, margotSite: false },
    { margotWhatsapp: false, margotSite: true },
  ]) {
    const plan = planKillCommand("pausar", state);
    assert.deepEqual(plan.changes, { margotWhatsapp: false, margotSite: false });
    assert.match(plan.reply, /Margot pausada/);
  }
});

test("pausar de novo não regrava nada e avisa que já estava pausada", () => {
  const plan = planKillCommand("pausar", { margotWhatsapp: false, margotSite: false });
  assert.deepEqual(plan.changes, {});
  assert.match(plan.reply, /já estava pausada/);
});

test("retomar liga as duas chaves; se já estava tudo ligado, não grava nada", () => {
  for (const state of [
    { margotWhatsapp: false, margotSite: false },
    { margotWhatsapp: true, margotSite: false },
    { margotWhatsapp: false, margotSite: true },
  ]) {
    const plan = planKillCommand("retomar", state);
    assert.deepEqual(plan.changes, { margotWhatsapp: true, margotSite: true });
    assert.match(plan.reply, /Margot de volta/);
  }
  const already = planKillCommand("retomar", { margotWhatsapp: true, margotSite: true });
  assert.deepEqual(already.changes, {});
  assert.match(already.reply, /já estava ligada/);
});

test("o que a resposta ensina a digitar funciona de verdade", () => {
  const paused = planKillCommand("pausar", { margotWhatsapp: true, margotSite: true }).reply;
  const resumed = planKillCommand("retomar", { margotWhatsapp: false, margotSite: false }).reply;
  const hint = (text: string) => [...text.matchAll(/\*([^*]+)\*/g)].map((m) => m[1]);
  assert.equal(parseKillCommand(hint(paused).find((h) => /retomar/i.test(h)) ?? ""), "retomar");
  assert.equal(parseKillCommand(hint(resumed).find((h) => /pausar/i.test(h)) ?? ""), "pausar");
});

test("se não der para gravar, a resposta diz que a Margot continua como estava e o que fazer no painel, na direção certa", () => {
  const pausar = killFailedReply("pausar");
  assert.match(pausar, /Não consegui pausar/);
  assert.match(pausar, /continua como estava/);
  assert.match(pausar, /Regras → desligue/);
  const retomar = killFailedReply("retomar");
  assert.match(retomar, /Não consegui retomar/);
  assert.match(retomar, /continua como estava/);
  assert.match(retomar, /Regras → ligue/);
  assert.doesNotMatch(retomar, /desligue/);
});
