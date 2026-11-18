import assert from "node:assert/strict";
import { test } from "node:test";
import { creditoLimpo } from "./curadoria.ts";
import { fotografosConhecidos } from "./fotografos.ts";

test("link do Instagram vira só o @", () => {
  assert.equal(creditoLimpo("https://www.instagram.com/estudio.exemplo/"), "@estudio.exemplo");
  assert.equal(creditoLimpo("instagram.com/estudio_exemplo?igsh=abc"), "@estudio_exemplo");
  assert.equal(creditoLimpo("Foto: Estúdio Exemplo"), "Estúdio Exemplo");
  assert.equal(creditoLimpo("https://exemplo.test/portfolio"), "https://exemplo.test/portfolio");
});

test("lista os fotógrafos do mais usado para o menos usado, sem repetir", () => {
  const f = fotografosConhecidos([
    { local: "chegada | Foto: @estudio.b", casal: "" },
    { local: "Foto: Estúdio A", casal: "" },
    { local: "Foto: estudio a", casal: "" },
    { local: "capa", casal: "" },
    { local: "Vinícola Exemplo", casal: "" },
  ]);
  assert.deepEqual(f.lista, ["Estúdio A", "@estudio.b"]);
});

test("sugere o fotógrafo que já fez o mesmo casal", () => {
  const f = fotografosConhecidos([
    { local: "Foto: Estúdio A", casal: "Casal Um" },
    { local: "Foto: @estudio.b", casal: "Casal Um" },
    { local: "Foto: @estudio.b", casal: "casal um" },
    { local: "", casal: "Casal Dois" },
  ]);
  assert.equal(f.doCasal("Casal Um"), "@estudio.b");
  assert.equal(f.doCasal("Casal Dois"), "");
  assert.equal(f.doCasal("Outro"), "");
});
