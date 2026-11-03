import { test } from "node:test";
import assert from "node:assert/strict";
import { contentRange, MAX_SLICE, parseByteRange } from "./range.ts";

test("sem Range (ou formato que não atendemos) responde o arquivo inteiro", () => {
  assert.equal(parseByteRange(null, 1000), null);
  assert.equal(parseByteRange("", 1000), null);
  assert.equal(parseByteRange("bytes=-", 1000), null);
  assert.equal(parseByteRange("items=0-5", 1000), null);
  assert.equal(parseByteRange("bytes=0-99,200-299", 1000), null); // várias faixas
  assert.equal(parseByteRange("lixo", 1000), null);
  assert.equal(parseByteRange("bytes=500-100", 1000), null); // faixa sem sentido: ignora
});

test("faixa comum, aberta e dos últimos bytes", () => {
  assert.deepEqual(parseByteRange("bytes=0-99", 1000), { start: 0, end: 99 });
  assert.deepEqual(parseByteRange("bytes=100-", 1000), { start: 100, end: 999 });
  assert.deepEqual(parseByteRange("bytes=-200", 1000), { start: 800, end: 999 });
  assert.deepEqual(parseByteRange("bytes=-5000", 1000), { start: 0, end: 999 }); // pede mais do que existe
  assert.deepEqual(parseByteRange(" BYTES = 0 - 1 ", 1000), { start: 0, end: 1 }); // o Safari pergunta 0-1 primeiro
});

test("fim além do arquivo é cortado no fim do arquivo", () => {
  assert.deepEqual(parseByteRange("bytes=900-5000", 1000), { start: 900, end: 999 });
});

test("início fora do arquivo é inválido (416)", () => {
  assert.equal(parseByteRange("bytes=1000-", 1000), "invalido");
  assert.equal(parseByteRange("bytes=5000-6000", 1000), "invalido");
  assert.equal(parseByteRange("bytes=-0", 1000), "invalido");
  assert.equal(parseByteRange("bytes=0-10", 0), "invalido"); // arquivo vazio
});

test("cada pedaço fica abaixo do limite de 4,5 MB da Vercel", () => {
  const size = 20_000_000;
  const r = parseByteRange("bytes=0-", size);
  assert.deepEqual(r, { start: 0, end: MAX_SLICE - 1 });
  const meio = parseByteRange("bytes=8000000-", size);
  assert.deepEqual(meio, { start: 8_000_000, end: 8_000_000 + MAX_SLICE - 1 });
  const fim = parseByteRange("bytes=-100", size);
  assert.deepEqual(fim, { start: size - 100, end: size - 1 });
  assert.ok(MAX_SLICE < 4.5 * 1024 * 1024);
});

test("Content-Range da resposta 206", () => {
  assert.equal(contentRange({ start: 0, end: 99 }, 1000), "bytes 0-99/1000");
});
