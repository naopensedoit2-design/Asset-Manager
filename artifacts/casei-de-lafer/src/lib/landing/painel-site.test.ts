import assert from "node:assert/strict";
import { test } from "node:test";
import type { FotoDoPainel } from "./curadoria.ts";
import { colocarNaCapa, colocarNoLugar, colocarNosDetalhes, fotosDaCapa, moverNaCapa, tirarDoLugar, trocarCredito, type Mudanca } from "./painel-site.ts";

const foto = (id: number, local = ""): FotoDoPainel => ({ id, url: `https://exemplo.test/${id}.jpg`, alt: "", casal: "", local });
const aplicar = (fotos: FotoDoPainel[], mudancas: Mudanca[]) =>
  fotos.map((f) => ({ ...f, local: mudancas.find((m) => m.id === f.id)?.local ?? f.local }));

test("colocar no lugar tira a foto que estava lá e mantém os créditos", () => {
  const fotos = [foto(1, "chegada | Foto: Estúdio A"), foto(2, "Foto: Estúdio B"), foto(3, "ensaio")];
  assert.deepEqual(colocarNoLugar(fotos, 2, "chegada"), [
    { id: 1, local: "Foto: Estúdio A" },
    { id: 2, local: "chegada | Foto: Estúdio B" },
  ]);
  assert.deepEqual(colocarNoLugar(fotos, 1, "chegada"), [], "já está lá: nada a gravar");
});

test("capa: entra no fim, sobe, desce e sai sem buraco na numeração", () => {
  let fotos = [foto(1, "capa 1"), foto(2, "capa 2"), foto(3), foto(4, "Foto: Estúdio C")];
  fotos = aplicar(fotos, colocarNaCapa(fotos, 4));
  assert.deepEqual(fotosDaCapa(fotos).map((f) => f.id), [1, 2, 4]);
  assert.equal(fotos.find((f) => f.id === 4)?.local, "capa 3 | Foto: Estúdio C");
  fotos = aplicar(fotos, moverNaCapa(fotos, 4, -1));
  assert.deepEqual(fotosDaCapa(fotos).map((f) => f.id), [1, 4, 2]);
  assert.deepEqual(moverNaCapa(fotos, 1, -1), [], "a primeira não sobe");
  fotos = aplicar(fotos, tirarDoLugar(fotos, 1));
  assert.deepEqual(fotosDaCapa(fotos).map((f) => f.id), [4, 2]);
  assert.deepEqual(fotos.map((f) => f.local), ["", "capa 2", "", "capa 1 | Foto: Estúdio C"]);
});

test("a capa não passa de 5 fotos", () => {
  const fotos = [1, 2, 3, 4, 5].map((n) => foto(n, `capa ${n}`)).concat(foto(6));
  assert.deepEqual(colocarNaCapa(fotos, 6), []);
});

test("detalhes aceitam várias fotos; vindo da capa, a capa se renumera", () => {
  let fotos = [foto(1, "capa 1"), foto(2, "capa 2"), foto(3, "detalhe")];
  fotos = aplicar(fotos, colocarNosDetalhes(fotos, 1));
  assert.deepEqual(fotos.map((f) => f.local), ["detalhe", "capa 1", "detalhe"]);
});

test("trocar o crédito não muda o lugar", () => {
  assert.equal(trocarCredito(foto(1, "capa 2"), "Estúdio D"), "capa 2 | Foto: Estúdio D");
  assert.equal(trocarCredito(foto(1, "ensaio | Foto: X"), ""), "ensaio");
  assert.equal(trocarCredito(foto(1, ""), "Estúdio E"), "Foto: Estúdio E");
});
