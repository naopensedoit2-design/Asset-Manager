import { test } from "node:test";
import assert from "node:assert/strict";
import { createMediaCache } from "./media-cache.ts";

const file = (n: number, mime = "video/mp4") => ({ data: Buffer.alloc(n), mime });

test("guarda e devolve o arquivo", () => {
  const c = createMediaCache({ maxBytes: 100, ttlMs: 1000 });
  c.set("a", file(10));
  assert.equal(c.get("a")?.data.length, 10);
  assert.equal(c.get("b"), undefined);
  assert.equal(c.bytes(), 10);
});

test("o arquivo vence depois do prazo", () => {
  let t = 0;
  const c = createMediaCache({ maxBytes: 100, ttlMs: 1000, now: () => t });
  c.set("a", file(10));
  t = 1000;
  assert.ok(c.get("a"));
  t = 1001;
  assert.equal(c.get("a"), undefined);
  assert.equal(c.bytes(), 0);
});

test("passando do limite, saem os mais antigos", () => {
  const c = createMediaCache({ maxBytes: 100, ttlMs: 1000 });
  c.set("a", file(40));
  c.set("b", file(40));
  c.set("c", file(40)); // não cabe com os outros dois: sai o "a"
  assert.equal(c.get("a"), undefined);
  assert.ok(c.get("b"));
  assert.ok(c.get("c"));
  assert.equal(c.bytes(), 80);
});

test("arquivo maior que o limite não é guardado", () => {
  const c = createMediaCache({ maxBytes: 100, ttlMs: 1000 });
  c.set("grande", file(101));
  assert.equal(c.get("grande"), undefined);
  assert.equal(c.bytes(), 0);
});

test("guardar de novo a mesma chave não conta duas vezes", () => {
  const c = createMediaCache({ maxBytes: 100, ttlMs: 1000 });
  c.set("a", file(30));
  c.set("a", file(50));
  assert.equal(c.bytes(), 50);
  assert.equal(c.count(), 1);
});

test("dois pedidos juntos do mesmo arquivo baixam uma vez só", async () => {
  const c = createMediaCache({ maxBytes: 100, ttlMs: 1000 });
  let downloads = 0;
  const load = async () => {
    downloads++;
    await new Promise((r) => setTimeout(r, 10));
    return file(20);
  };
  const [x, y] = await Promise.all([c.getOrLoad("v", load), c.getOrLoad("v", load)]);
  assert.equal(downloads, 1);
  assert.equal(x, y);
  // e o terceiro pedido, depois, sai do cache
  await c.getOrLoad("v", load);
  assert.equal(downloads, 1);
});

test("download que falha não fica preso: o próximo pedido tenta de novo", async () => {
  const c = createMediaCache({ maxBytes: 100, ttlMs: 1000 });
  await assert.rejects(c.getOrLoad("v", async () => Promise.reject(new Error("meta fora do ar"))), /meta fora do ar/);
  const ok = await c.getOrLoad("v", async () => file(5));
  assert.equal(ok.data.length, 5);
});
