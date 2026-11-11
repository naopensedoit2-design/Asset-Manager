import assert from "node:assert/strict";
import { test } from "node:test";
import { precoCarroDaNoiva, servicosPublicos, type ServicoDoPainel } from "./servicos.ts";

// Como os serviços ficam em Regras desde as faixas por região: dois principais com valor-base,
// a Saída dos Noivos como adicional e um adicional de região para cada serviço principal.
const REGRAS: ServicoDoPainel[] = [
  { name: "Carro da Noiva", description: "Chegada da noiva no MP Lafer conversível.", priceCents: 240000, isAddon: false },
  { name: "Saída dos Noivos", description: "O carro permanece após a chegada da noiva.", priceCents: 50000, isAddon: true },
  { name: "Ensaio Pré-Wedding", description: "Até 3 horas no local.", priceCents: 195000, isAddon: false },
  { name: "Região de Caxias (Carro da Noiva)", description: "", priceCents: 20000, isAddon: true },
  { name: "Região de Caxias (Ensaio)", description: "", priceCents: 25000, isAddon: true },
];

test("os serviços principais aparecem com o valor-base", () => {
  const lista = servicosPublicos(REGRAS);
  const noiva = lista.find((s) => s.nome === "Carro da Noiva");
  const ensaio = lista.find((s) => s.nome === "Ensaio Pré-Wedding");
  assert.equal(noiva?.aPartirDeCents, 240000);
  assert.equal(ensaio?.aPartirDeCents, 195000);
});

test("a Saída dos Noivos aparece como adicional e sem valor", () => {
  const saida = servicosPublicos(REGRAS).find((s) => s.nome === "Saída dos Noivos");
  assert.ok(saida);
  assert.equal(saida.adicional, true);
  assert.equal(saida.aPartirDeCents, null);
});

test("o adicional de região nunca aparece na página", () => {
  const nomes = servicosPublicos(REGRAS).map((s) => s.nome);
  assert.ok(!nomes.some((n) => /regi[aã]o/i.test(n)));
  assert.equal(nomes.length, 3);
});

test("serviço principal sem valor cadastrado não aparece", () => {
  const lista = servicosPublicos([{ name: "Carro da Noiva", description: "", priceCents: 0, isAddon: false }]);
  assert.deepEqual(lista, []);
});

test("o valor do Carro da Noiva vem das Regras; sem o serviço, não há valor", () => {
  assert.equal(precoCarroDaNoiva(REGRAS), 240000);
  assert.equal(precoCarroDaNoiva(REGRAS.filter((s) => s.name !== "Carro da Noiva")), null);
  assert.equal(precoCarroDaNoiva([]), null);
});

test("o adicional de região do Carro da Noiva não é confundido com o serviço", () => {
  const soRegiao = REGRAS.filter((s) => s.isAddon);
  assert.equal(precoCarroDaNoiva(soRegiao), null);
});
