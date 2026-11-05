import { test } from "node:test";
import assert from "node:assert/strict";
import { horaLocal, precisaLembrete, textoLembrete, type ConversaParada } from "./lembrete.ts";

// 15h em São Paulo (18h UTC).
const now = new Date("2026-11-04T18:00:00Z");
const h = (n: number) => new Date(now.getTime() - n * 3_600_000);
const base: ConversaParada = {
  isOwner: false,
  ignored: false,
  paused: false,
  blocked: false,
  lastInboundAt: h(6),
  last: { direction: "out", author: "margot", kind: "", createdAt: h(5.9) },
  lembradoDepois: false,
  pedidoFechado: false,
  pareceLead: true,
};

test("lead quieto há 6 h depois da resposta da Margot recebe lembrete", () => {
  assert.equal(horaLocal(now), 15);
  assert.equal(precisaLembrete(base, now), true);
});

test("não lembra cedo demais, nem com a janela fechando, nem fora do horário", () => {
  assert.equal(precisaLembrete({ ...base, lastInboundAt: h(2) }, now), false);
  assert.equal(precisaLembrete({ ...base, lastInboundAt: h(23.8) }, now), false);
  assert.equal(precisaLembrete(base, new Date("2026-11-05T01:30:00Z")), false); // 22h30 local
  assert.equal(precisaLembrete(base, new Date("2026-11-04T11:00:00Z")), false); // 8h local
});

test("uma vez só, e nunca para dono, ignorada, pausada, pedido fechado ou quem não parece lead", () => {
  assert.equal(precisaLembrete({ ...base, lembradoDepois: true }, now), false);
  assert.equal(precisaLembrete({ ...base, last: { ...base.last!, kind: "lembrete" } }, now), false);
  assert.equal(precisaLembrete({ ...base, last: { ...base.last!, direction: "in" } }, now), false);
  assert.equal(precisaLembrete({ ...base, last: { ...base.last!, author: "leonardo" } }, now), false);
  for (const k of ["isOwner", "ignored", "paused", "blocked", "pedidoFechado"] as const) assert.equal(precisaLembrete({ ...base, [k]: true }, now), false);
  assert.equal(precisaLembrete({ ...base, pareceLead: false }, now), false);
});

test("texto usa o primeiro nome", () => {
  assert.match(textoLembrete("Ana & Beto"), /^Oi, Ana!/);
  assert.match(textoLembrete(""), /^Oi! Passando/);
});

import { falaDoServico } from "./lembrete.ts";

test("lead é quem fala do serviço; valor sozinho não conta", () => {
  assert.equal(falaDoServico("oii\nqual o valor da progressiva?"), false);
  assert.equal(falaDoServico("Qual o valor do carro para o casamento?"), true);
  assert.equal(falaDoServico("Oi! Vi o anúncio que o dia 12/12/2026 (sábado) está livre."), false);
  assert.equal(falaDoServico("Oi! Vi no site que o dia 12/12 está livre. Quero saber sobre o MP Lafer para essa data."), true);
  assert.equal(falaDoServico("vocês fazem ensaio pré-wedding?"), true);
  assert.equal(falaDoServico("A NOIVA vai se arrumar no salão"), true);
});
