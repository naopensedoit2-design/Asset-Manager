import assert from "node:assert/strict";
import { test } from "node:test";
import { ehCloudinary, otimizada, srcSet } from "./imagem.ts";

const FOTO = "https://res.cloudinary.com/exemplo/image/upload/v1790726493/pasta/galeria/abc123.jpg";

test("Cloudinary: insere formato e qualidade automáticos e limita a largura", () => {
  assert.equal(
    otimizada(FOTO, 800),
    "https://res.cloudinary.com/exemplo/image/upload/f_auto,q_auto,c_limit,w_800/v1790726493/pasta/galeria/abc123.jpg",
  );
});

test("Cloudinary: arredonda a largura e não aceita menos que 16 px", () => {
  assert.match(otimizada(FOTO, 799.6), /w_800\//);
  assert.match(otimizada(FOTO, 2), /w_16\//);
});

test("Cloudinary com transformação já cadastrada: a nossa vem antes e a antiga continua", () => {
  const comTransformacao = "https://res.cloudinary.com/exemplo/image/upload/c_fill,w_500/v1/pasta/abc.jpg";
  assert.equal(
    otimizada(comTransformacao, 640),
    "https://res.cloudinary.com/exemplo/image/upload/f_auto,q_auto,c_limit,w_640/c_fill,w_500/v1/pasta/abc.jpg",
  );
});

test("Cloudinary que já usa f_auto não é alterada", () => {
  const pronta = "https://res.cloudinary.com/exemplo/image/upload/f_auto,q_auto/v1/pasta/abc.jpg";
  assert.equal(otimizada(pronta, 640), pronta);
});

test("o que não é do Cloudinary passa sem mudança", () => {
  assert.equal(otimizada("/hero-desktop.jpg", 800), "/hero-desktop.jpg");
  assert.equal(otimizada("https://exemplo.com/foto.jpg", 800), "https://exemplo.com/foto.jpg");
  assert.equal(otimizada("https://res.cloudinary.com/exemplo/video/upload/v1/a.mp4", 800), "https://res.cloudinary.com/exemplo/video/upload/v1/a.mp4");
});

test("srcset: uma entrada por largura, na ordem; undefined fora do Cloudinary", () => {
  const valor = srcSet(FOTO, [480, 960]);
  assert.ok(valor);
  const partes = valor.split(", ");
  assert.equal(partes.length, 2);
  assert.match(partes[0], /w_480\/.* 480w$/);
  assert.match(partes[1], /w_960\/.* 960w$/);
  assert.equal(srcSet("/proposta/foto.jpg", [480, 960]), undefined);
});

test("ehCloudinary reconhece só imagens enviadas ao Cloudinary", () => {
  assert.equal(ehCloudinary(FOTO), true);
  assert.equal(ehCloudinary("/hero-desktop.jpg"), false);
});
