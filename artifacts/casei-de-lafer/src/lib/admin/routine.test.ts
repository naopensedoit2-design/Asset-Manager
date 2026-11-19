import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRoutineRecord, describeRoutine, parseRoutine } from "./routine.ts";

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

test("describeRoutine: a Margot sabe dizer se o resumo saiu e por quê", () => {
  const hoje = new Date("2026-11-18T23:00:00Z");
  const rodou = buildRoutineRecord({ enviado: false, motivo: "Resumo diário desligado em Regras" }, new Date("2026-11-18T10:04:00Z"));
  const t = describeRoutine(rodou, hoje);
  assert.match(t, /hoje às 07:04/);
  assert.match(t, /NÃO foi enviado \(motivo: Resumo diário desligado em Regras\)/);
  assert.doesNotMatch(t, /mais de um dia/);
  assert.match(describeRoutine(buildRoutineRecord({ enviado: true, como: "enviado" }, new Date("2026-11-18T10:04:00Z")), hoje), /o resumo foi enviado\./);
  assert.match(describeRoutine(buildRoutineRecord({ enviado: true, como: "modelo" }, new Date("2026-11-18T10:04:00Z")), hoje), /modelo de aviso/);
});

test("describeRoutine: rotina parada, sem registro ou sem CRON_SECRET", () => {
  const hoje = new Date("2026-11-18T23:00:00Z");
  const antiga = buildRoutineRecord({ enviado: true }, new Date("2026-11-15T10:04:00Z"));
  assert.match(describeRoutine(antiga, hoje), /15\/11\/2026 às 07:04.*mais de um dia/);
  assert.match(describeRoutine(null, hoje), /Não há registro/);
  assert.match(describeRoutine(antiga, hoje, false), /falta a variável CRON_SECRET/);
});
