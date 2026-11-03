import { test } from "node:test";
import assert from "node:assert/strict";
import { idsDeOrdem, ordenar, prioridade, proximaPosicaoNoTopo, tom, type OrdemItem } from "./ordem.ts";

const c = (id: number, over: Partial<OrdemItem> = {}): OrdemItem => ({
  id,
  isOwner: false,
  pinOrder: null,
  waiting: false,
  onlyNotice: false,
  hasOrder: false,
  lastMessageAt: `2026-11-0${Math.min(id, 9)}T12:00:00.000Z`,
  ...over,
});
const ids = (l: OrdemItem[]) => ordenar(l).map((x) => x.id);

test("a conversa do dono é sempre a primeira, mesmo com fixadas e esperando resposta", () => {
  assert.deepEqual(ids([c(3, { waiting: true, hasOrder: true }), c(2, { pinOrder: 0 }), c(1, { isOwner: true, lastMessageAt: null })]), [1, 2, 3]);
});

test("as fixadas ficam acima do resto e seguem a ordem escolhida, não a data", () => {
  assert.deepEqual(ids([c(1, { pinOrder: 2 }), c(5, { waiting: true }), c(2, { pinOrder: 0 }), c(3, { pinOrder: 1 })]), [2, 3, 1, 5]);
});

test("ordem automática: pedido esperando, esperando, pedido em andamento, resto, só aviso do WhatsApp", () => {
  const lista = [
    c(9, { onlyNotice: true, waiting: false }),
    c(8),
    c(7, { hasOrder: true }),
    c(6, { waiting: true }),
    c(5, { waiting: true, hasOrder: true }),
  ];
  assert.deepEqual(ids(lista), [5, 6, 7, 8, 9]);
});

test("dentro do mesmo grupo, a mais recente vem primeiro; sem data vai para o fim", () => {
  assert.deepEqual(ids([c(1, { lastMessageAt: null }), c(2, { lastMessageAt: "2026-11-01T10:00:00.000Z" }), c(3, { lastMessageAt: "2026-11-02T10:00:00.000Z" })]), [3, 2, 1]);
});

test("aviso do WhatsApp sem conteúdo desce mesmo marcado como esperando", () => {
  assert.equal(prioridade({ waiting: true, onlyNotice: true, hasOrder: true }), 4);
  assert.deepEqual(ids([c(1, { waiting: true, onlyNotice: true }), c(2)]), [2, 1]);
});

test("ordenar não muda a lista recebida", () => {
  const lista = [c(1), c(2, { waiting: true })];
  ordenar(lista);
  assert.deepEqual(lista.map((x) => x.id), [1, 2]);
});

test("nova fixada entra acima das que já estavam fixadas", () => {
  assert.equal(proximaPosicaoNoTopo([null, null]), 0);
  assert.equal(proximaPosicaoNoTopo([0, 1, null]), -1);
  assert.equal(proximaPosicaoNoTopo([-3, 2]), -4);
});

test("a lista enviada ao arrastar só aceita ids inteiros, positivos e sem repetição", () => {
  assert.deepEqual(idsDeOrdem([3, 1, 2]), [3, 1, 2]);
  for (const ruim of [[], [1, 1], [1.5], ["2"], [0], [-1], null, "1,2", {}, Array.from({ length: 201 }, (_, i) => i + 1)]) {
    assert.equal(idsDeOrdem(ruim), null, JSON.stringify(ruim)?.slice(0, 40));
  }
});

test("a cor da linha: dono, aviso sem conteúdo, pedido, esperando, pausada, normal (nessa ordem de importância)", () => {
  const base = { isOwner: false, hasOrder: false, waiting: false, onlyNotice: false, paused: false };
  assert.equal(tom({ ...base, isOwner: true, hasOrder: true }), "dono");
  assert.equal(tom({ ...base, onlyNotice: true, waiting: true, hasOrder: true }), "aviso");
  assert.equal(tom({ ...base, hasOrder: true, waiting: true }), "pedido");
  assert.equal(tom({ ...base, waiting: true, paused: true }), "esperando");
  assert.equal(tom({ ...base, paused: true }), "pausada");
  assert.equal(tom(base), "normal");
});
