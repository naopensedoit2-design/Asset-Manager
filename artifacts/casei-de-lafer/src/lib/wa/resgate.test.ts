import { test } from "node:test";
import assert from "node:assert/strict";
import { precisaResgate, type UltimaEntrada } from "./resgate.ts";

const now = new Date("2026-11-05T21:30:00Z");
const min = (n: number) => new Date(now.getTime() - n * 60_000);
const base: UltimaEntrada = {
  isOwner: false,
  ignored: false,
  paused: false,
  blocked: false,
  margotOn: true,
  lastIn: { createdAt: min(6), handled: true },
  respondida: false,
  jaResgatada: false,
};

test("mensagem tratada e sem resposta há 6 min é resgatada", () => {
  assert.equal(precisaResgate(base, now), true);
});

test("não resgata cedo, tarde, respondida, ainda na fila ou já resgatada", () => {
  assert.equal(precisaResgate({ ...base, lastIn: { createdAt: min(1), handled: true } }, now), false);
  assert.equal(precisaResgate({ ...base, lastIn: { createdAt: min(90), handled: true } }, now), false);
  assert.equal(precisaResgate({ ...base, respondida: true }, now), false);
  assert.equal(precisaResgate({ ...base, lastIn: { createdAt: min(6), handled: false } }, now), false);
  assert.equal(precisaResgate({ ...base, jaResgatada: true }, now), false);
});

test("respeita ignorada, pausada, bloqueada e Margot desligada (menos no modo secretária)", () => {
  for (const k of ["ignored", "paused", "blocked"] as const) assert.equal(precisaResgate({ ...base, [k]: true }, now), false);
  assert.equal(precisaResgate({ ...base, margotOn: false }, now), false);
  assert.equal(precisaResgate({ ...base, margotOn: false, isOwner: true }, now), true);
});
