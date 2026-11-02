import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRoutineRecord, parseRoutine } from "./routine.ts";

const now = new Date("2026-10-30T10:00:12Z");

test("resumo enviado", () => {
  assert.deepEqual(buildRoutineRecord({ enviado: true, como: "enviado" }, now), { at: "2026-10-30T10:00:12.000Z", resumoEnviado: true, detalhe: "resumo enviado" });
});

test("resumo enviado pelo aviso modelo (conversa com o dono estava fechada)", () => {
  assert.equal(buildRoutineRecord({ enviado: true, como: "modelo" }, now).detalhe, "aviso modelo (conversa fechada)");
});

test("resumo não enviado guarda o motivo", () => {
  assert.deepEqual(buildRoutineRecord({ enviado: false, motivo: "Nada para avisar hoje" }, now), {
    at: "2026-10-30T10:00:12.000Z",
    resumoEnviado: false,
    detalhe: "Nada para avisar hoje",
  });
  assert.equal(buildRoutineRecord({ enviado: false }, now).detalhe, null);
});

test("parseRoutine devolve o que foi guardado e ignora lixo", () => {
  const rec = buildRoutineRecord({ enviado: true }, now);
  assert.deepEqual(parseRoutine(JSON.stringify(rec)), rec);
  assert.equal(parseRoutine(null), null);
  assert.equal(parseRoutine(""), null);
  assert.equal(parseRoutine("{quebrado"), null);
  assert.equal(parseRoutine(JSON.stringify({ at: "ontem" })), null);
  assert.equal(parseRoutine(JSON.stringify({ at: 5 })), null);
  assert.deepEqual(parseRoutine(JSON.stringify({ at: "2026-10-30T10:00:12.000Z", resumoEnviado: "sim", detalhe: 3 })), {
    at: "2026-10-30T10:00:12.000Z",
    resumoEnviado: null,
    detalhe: null,
  });
});
