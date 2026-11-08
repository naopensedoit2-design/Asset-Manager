import { test } from "node:test";
import assert from "node:assert/strict";
import { projetarAno } from "./projecao.ts";

const base = {
  eventosPorMes: [6, 2, 4],
  ticketCents: 200000, // R$ 2.000
  custoFixoMensalCents: 50000, // R$ 500
  custoPorEventoCents: 10000, // R$ 100
  manutencaoAnualCents: 600000, // R$ 6.000
};

test("projeta o ano em cada cenário, do menor para o maior", () => {
  const p = projetarAno(base);
  assert.equal(p.meses, 12);
  assert.deepEqual(p.cenarios.map((c) => c.eventosMes), [2, 4, 6]);
  const dois = p.cenarios[0];
  assert.equal(dois.eventosAno, 24);
  assert.equal(dois.faturamentoCents, 4800000); // 24 × 2.000
  // 500 × 12 + 100 × 24 + 6.000 = 14.400
  assert.equal(dois.custosCents, 1440000);
  assert.equal(dois.lucroCents, 3360000);
  assert.equal(dois.lucroMesCents, 280000);
  assert.equal(dois.margemPct, 70);
});

test("ponto de equilíbrio arredonda para cima", () => {
  // Custo mensal sem evento: 500 + 6.000/12 = 1.000; cada evento deixa 1.900 → 1 evento basta.
  assert.equal(projetarAno(base).equilibrioEventosMes, 1);
  assert.equal(projetarAno({ ...base, custoFixoMensalCents: 300000 }).equilibrioEventosMes, 2); // (3.000 + 500) / 1.900 = 1,8
  assert.equal(projetarAno({ ...base, custoFixoMensalCents: 400000 }).equilibrioEventosMes, 3); // (4.000 + 500) / 1.900 = 2,4
});

test("avisa quando o cenário passa dos fins de semana e quando falta o valor", () => {
  const p = projetarAno({ ...base, eventosPorMes: [4, 10] });
  assert.ok(p.avisos.some((a) => a.includes("dias de semana") && a.includes("10")));
  const semTicket = projetarAno({ ...base, ticketCents: 0 });
  assert.equal(semTicket.cenarios[0].margemPct, null);
  assert.equal(semTicket.equilibrioEventosMes, null);
  assert.ok(semTicket.avisos.length > 0);
});

test("manutenção é proporcional aos meses projetados e valores ruins viram zero", () => {
  const seis = projetarAno({ ...base, eventosPorMes: [2, 2, -3], meses: 6 });
  assert.deepEqual(seis.cenarios.map((c) => c.eventosMes), [0, 2]);
  // 500 × 6 + 100 × 12 + 3.000 = 7.200
  assert.equal(seis.cenarios[1].custosCents, 720000);
});
