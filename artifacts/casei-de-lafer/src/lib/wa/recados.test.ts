import { test } from "node:test";
import assert from "node:assert/strict";
import { descreverRecados, gravarRecado, lerRecado, novoRecado, RECADO_DIAS, recadosDe, recadosValendo, type Recado } from "./recados.ts";

const r = (cliente: string, criadoEm = "2026-11-08", id = "a1"): Recado => ({ id, cliente, texto: "desconto de 5% no total", criadoEm });

test("novo recado exige nome e texto", () => {
  assert.equal(typeof novoRecado("", "5%", "2026-11-08", "x"), "string");
  assert.equal(typeof novoRecado("Fulana", "  ", "2026-11-08", "x"), "string");
  const ok = novoRecado("  Fulana   Teste ", "dar  5% de desconto", "2026-11-08", "x");
  assert.deepEqual(ok, { id: "x", cliente: "Fulana Teste", texto: "dar 5% de desconto", criadoEm: "2026-11-08" });
});

test("grava e lê de volta pela tabela Setting", () => {
  const g = gravarRecado(r("Fulana"));
  assert.equal(g.key, "margotRecado:a1");
  assert.deepEqual(lerRecado(g.key, g.value), r("Fulana"));
  assert.equal(lerRecado("outraChave:a1", g.value), null);
  assert.equal(lerRecado("margotRecado:a1", "não é json"), null);
});

test("combina pelo nome sem acento e sem diferença de maiúscula", () => {
  const lista = [r("Beltrána", "2026-11-08", "1"), r("Ciclana Exemplo", "2026-11-08", "2")];
  assert.deepEqual(recadosDe(lista, "BELTRANA de Tal").map((x) => x.id), ["1"]);
  assert.deepEqual(recadosDe(lista, "Ciclana Exemplo Silva").map((x) => x.id), ["2"]);
  // Só o primeiro nome não basta quando o recado tem sobrenome.
  assert.deepEqual(recadosDe(lista, "Ciclana Outra"), []);
  // Pedaço de palavra não combina.
  assert.deepEqual(recadosDe(lista, "Beltranalina"), []);
  assert.deepEqual(recadosDe(lista, ""), []);
});

test("recado vencido sai e os mais novos vêm primeiro", () => {
  const rows = [r("A", "2026-01-01", "velho"), r("B", "2026-10-01", "meio"), r("C", "2026-11-08", "novo")].map(gravarRecado);
  const hoje = "2026-11-09";
  const v = recadosValendo(rows, hoje);
  assert.deepEqual(v.map((x) => x.id), ["novo", "meio"]);
  assert.ok(RECADO_DIAS >= 90);
});

test("descrição traz nome, recado e código", () => {
  assert.equal(descreverRecados([r("Fulana")]), "• Fulana: desconto de 5% no total (código a1)");
});
