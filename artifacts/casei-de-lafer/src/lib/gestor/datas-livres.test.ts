import { test } from "node:test";
import assert from "node:assert/strict";
import { datasLivres, diaDaSemana, fimDoProximoMes, mensagemDaData, mesesAte, origemDaPagina } from "./datas-livres.ts";

test("dia da semana sem depender do fuso", () => {
  assert.equal(diaDaSemana("2026-12-12"), 6);
  assert.equal(diaDaSemana("2026-12-13"), 0);
});

test("só dias livres de amanhã até o limite, com rótulo e fim de semana marcado", () => {
  const dias = [
    { data: "2026-11-04", status: "livre" },
    { data: "2026-11-05", status: "livre" },
    { data: "2026-11-07", status: "ocupada" },
    { data: "2026-11-06", status: "livre" },
    { data: "2026-12-31", status: "livre" },
    { data: "2027-01-02", status: "livre" },
  ];
  const r = datasLivres(dias, "2026-11-04", "2026-12-31");
  assert.deepEqual(r.map((d) => d.data), ["2026-11-05", "2026-11-06", "2026-12-31"]);
  assert.equal(r[1].rotulo, "sexta, 06/11");
  assert.deepEqual(r.map((d) => d.fimDeSemana), [false, true, false]);
});

test("mês atual e o próximo", () => {
  assert.equal(fimDoProximoMes("2026-11-04"), "2026-12-31");
  assert.equal(fimDoProximoMes("2026-12-10"), "2027-01-31");
  assert.deepEqual(mesesAte("2026-12-10", "2027-01-31"), [{ ano: 2026, mes: 12 }, { ano: 2027, mes: 1 }]);
});

test("mensagem pronta cita a data e a origem; origem desconhecida vira site", () => {
  const dia = { data: "2026-12-12", rotulo: "sábado, 12/12", fimDeSemana: true };
  assert.equal(mensagemDaData(dia, "anuncio"), "Oi! Vi o anúncio que o dia 12/12/2026 (sábado) está livre. Quero saber sobre o MP Lafer para essa data.");
  assert.match(mensagemDaData(null, "site"), /Vi no site as datas livres/);
  assert.equal(origemDaPagina("anuncio"), "anuncio");
  assert.equal(origemDaPagina("<script>"), "site");
});
