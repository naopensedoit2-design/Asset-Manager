import assert from "node:assert/strict";
import { test } from "node:test";
import { ALT_PADRAO, curar, lerLocal, montarLocal, type FotoDoPainel } from "./curadoria.ts";

let proximoId = 1;
const foto = (local = "", casal = "", alt = ""): FotoDoPainel => ({ id: proximoId++, url: `https://exemplo.test/${proximoId}.jpg`, alt, casal, local });

test("o campo Local do painel diz o lugar da foto na página", () => {
  assert.deepEqual(lerLocal("chegada"), { lugar: "chegada", credito: "", ordem: 0 });
  assert.deepEqual(lerLocal(" #Saída "), { lugar: "saida", credito: "", ordem: 0 });
  assert.deepEqual(lerLocal("Cenário"), { lugar: "cenario", credito: "", ordem: 0 });
  assert.deepEqual(lerLocal("detalhes"), { lugar: "detalhe", credito: "", ordem: 0 });
});

test("o crédito vem depois da barra, com ou sem a palavra Foto", () => {
  assert.deepEqual(lerLocal("chegada | Foto: Estúdio Exemplo"), { lugar: "chegada", credito: "Estúdio Exemplo", ordem: 0 });
  assert.deepEqual(lerLocal("ensaio|Estúdio Exemplo"), { lugar: "ensaio", credito: "Estúdio Exemplo", ordem: 0 });
  assert.deepEqual(lerLocal("Foto: Estúdio Exemplo"), { lugar: null, credito: "Estúdio Exemplo", ordem: 0 });
  assert.equal(lerLocal("final | " + "x".repeat(200)).credito.length, 60);
});

test("texto que não é um lugar da página é ignorado (o campo pode ter um endereço antigo)", () => {
  assert.deepEqual(lerLocal("Vinícola Exemplo"), { lugar: null, credito: "", ordem: 0 });
  assert.deepEqual(lerLocal(""), { lugar: null, credito: "", ordem: 0 });
});

test("foto marcada vai para o lugar marcado, mesmo sendo mais antiga", () => {
  const recente = foto();
  const daChegada = foto("chegada | Foto: Estúdio Exemplo");
  const c = curar([recente, daChegada]);
  assert.equal(c.chegada?.id, daChegada.id);
  assert.equal(c.chegada?.credito, "Estúdio Exemplo");
  assert.equal(c.saida?.id, recente.id);
});

test("sem nenhuma marcação, a página usa as fotos na ordem do painel", () => {
  const fotos = [foto(), foto(), foto(), foto(), foto()];
  const c = curar(fotos);
  assert.deepEqual([c.chegada, c.saida, c.ensaio, c.carro, c.final].map((f) => f?.id), fotos.map((f) => f.id));
  assert.equal(c.capa, null);
});

test("capa, passagem e cenário só entram quando marcados", () => {
  const c = curar([foto(), foto(), foto(), foto(), foto(), foto(), foto()]);
  assert.equal(c.passagem, null);
  assert.equal(c.cenario, null);
  const marcado = curar([foto("passagem"), foto("cenario"), foto("capa")]);
  assert.ok(marcado.passagem && marcado.cenario && marcado.capa);
  assert.equal(marcado.chegada, null);
});

test("o mesmo casal não aparece duas vezes seguidas quando há outro para alternar", () => {
  const a1 = foto("", "Casal A");
  const a2 = foto("", "casal a");
  const b1 = foto("", "Casal B");
  const b2 = foto("", "Casal B");
  const c = curar([a1, a2, b1, b2]);
  assert.deepEqual([c.chegada?.id, c.saida?.id, c.ensaio?.id, c.carro?.id], [a1.id, b1.id, a2.id, b2.id]);
});

test("a tag do casal nunca sai na foto que vai para a página", () => {
  const c = curar([foto("chegada", "Nome Secreto")]);
  assert.doesNotMatch(JSON.stringify(c), /Secreto/i);
});

test("a faixa de detalhes usa as marcadas e só aparece com quatro fotos ou mais", () => {
  const marcadas = [foto("detalhe"), foto("detalhe"), foto("detalhe"), foto("detalhe")];
  assert.deepEqual(curar(marcadas).detalhes.map((f) => f.id), marcadas.map((f) => f.id));
  assert.deepEqual(curar([foto("detalhe"), foto("detalhe")]).detalhes, []);
  // com poucas marcadas, completa com as fotos que sobraram dos outros lugares
  const poucas = [foto("detalhe"), foto(), foto(), foto(), foto(), foto(), foto(), foto(), foto()];
  assert.equal(curar(poucas).detalhes.length, 4);
});

test("foto sem descrição no painel recebe uma descrição padrão", () => {
  const c = curar([foto("chegada", "", "  "), foto("saida", "", "Noivos saindo no MP Lafer")]);
  assert.equal(c.chegada?.alt, ALT_PADRAO);
  assert.equal(c.saida?.alt, "Noivos saindo no MP Lafer");
});

test("duas fotos marcadas para o mesmo lugar: a mais recente fica, a outra completa a página", () => {
  const primeira = foto("final");
  const segunda = foto("final");
  const c = curar([primeira, segunda]);
  assert.equal(c.final?.id, primeira.id);
  assert.equal(c.chegada?.id, segunda.id);
});

test("a capa aceita várias fotos, na ordem marcada (carrossel)", () => {
  const sem = foto("capa");
  const segunda = foto("capa 2");
  const primeira = foto("Capa 1 | Foto: Estúdio Exemplo");
  const c = curar([sem, segunda, primeira, foto()]);
  assert.deepEqual(c.capas.map((f) => f.id), [primeira.id, segunda.id, sem.id]);
  assert.equal(c.capa?.id, primeira.id);
  assert.equal(c.capas[0]?.credito, "Estúdio Exemplo");
  // fotos da capa não são usadas de novo em outro lugar
  assert.ok(![c.chegada, c.saida, c.ensaio, c.carro, c.final].some((f) => f && c.capas.some((k) => k.id === f.id)));
});

test("a capa tem no máximo 5 fotos", () => {
  const c = curar([1, 2, 3, 4, 5, 6, 7].map((n) => foto(`capa ${n}`)));
  assert.equal(c.capas.length, 5);
});

test("montarLocal escreve o que lerLocal lê", () => {
  assert.equal(montarLocal("chegada", "Estúdio Exemplo"), "chegada | Foto: Estúdio Exemplo");
  assert.equal(montarLocal("capa", "", 2), "capa 2");
  assert.equal(montarLocal(null, "Estúdio Exemplo"), "Foto: Estúdio Exemplo");
  assert.equal(montarLocal(null, "  "), "");
  for (const [lugar, credito, ordem] of [["ensaio", "A B", 0], ["capa", "C", 3], [null, "D", 0]] as const) {
    const lido = lerLocal(montarLocal(lugar, credito, ordem));
    assert.deepEqual(lido, { lugar, credito, ordem });
  }
});
