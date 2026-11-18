import assert from "node:assert/strict";
import { test } from "node:test";
import { ehImagem, idDaPasta, idsJaImportados, miniaturaNoTamanho, motivoDoErro, publicIdDoDrive } from "./drive-regras.ts";

test("lê o id da pasta do link do Drive ou do próprio id", () => {
  assert.equal(idDaPasta("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp?usp=sharing"), "1AbCdEfGhIjKlMnOp");
  assert.equal(idDaPasta("https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp"), "1AbCdEfGhIjKlMnOp");
  assert.equal(idDaPasta(" 1AbCdEfGhIjKlMnOp "), "1AbCdEfGhIjKlMnOp");
  for (const ruim of ["", "pasta", "https://exemplo.test/x y", null]) assert.equal(idDaPasta(ruim), null);
});

test("só imagens entram", () => {
  assert.ok(ehImagem("image/jpeg") && ehImagem("image/heic"));
  assert.ok(!ehImagem("video/mp4") && !ehImagem("application/pdf"));
});

test("pede ao Drive a versão no tamanho do site", () => {
  assert.equal(miniaturaNoTamanho("https://lh3.example/abc=s220", 2400), "https://lh3.example/abc=s2400");
  assert.equal(miniaturaNoTamanho("https://lh3.example/abc=s220-c", 400), "https://lh3.example/abc=s400");
  assert.equal(miniaturaNoTamanho("https://lh3.example/abc", 99999), "https://lh3.example/abc=s4000");
});

test("reconhece o que já foi importado pelo nome no Cloudinary", () => {
  assert.equal(publicIdDoDrive("1Ab_c-D"), "drive-1Ab_c-D");
  const ids = idsJaImportados(["casei-de-lafer/gallery/drive-1Abc", "casei-de-lafer/gallery/xyz", "drive-2Def"]);
  assert.deepEqual([...ids].sort(), ["1Abc", "2Def"]);
});

test("explica o que fazer quando o Google recusa", () => {
  assert.match(motivoDoErro(403, "Google Drive API has not been used in project 1", "x@y.iam"), /Ativar/);
  assert.match(motivoDoErro(404, "File not found", "conta@projeto.iam.gserviceaccount.com"), /conta@projeto/);
  assert.match(motivoDoErro(500, "erro", null), /500/);
});
