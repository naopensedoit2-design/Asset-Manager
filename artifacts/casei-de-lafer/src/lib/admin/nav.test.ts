import { test } from "node:test";
import assert from "node:assert/strict";
import { activeTab, hidesTabBar, isBare } from "./nav.ts";

test("cada rota liga a aba certa", () => {
  assert.equal(activeTab("/admin/hoje"), "hoje");
  assert.equal(activeTab("/admin/pedidos"), "pedidos");
  assert.equal(activeTab("/admin/pedidos/12"), "pedidos");
  assert.equal(activeTab("/admin/pedidos/novo"), "pedidos");
  assert.equal(activeTab("/admin/conversas"), "conversas");
  assert.equal(activeTab("/admin/conversas/3"), "conversas");
  assert.equal(activeTab("/admin/financeiro"), "dinheiro");
  assert.equal(activeTab("/admin/financeiro/"), "dinheiro");
});

test("o que não é aba principal cai em Mais", () => {
  for (const p of ["/admin/mais", "/admin/conexoes", "/admin/regras", "/admin/dashboard", "/admin/site"]) {
    assert.equal(activeTab(p), "mais", p);
  }
});

test("prefixos parecidos não enganam", () => {
  assert.equal(activeTab("/admin/hojeontem"), "mais");
  assert.equal(activeTab("/admin/pedidosx"), "mais");
});

test("o menu inferior some só dentro de uma conversa", () => {
  assert.equal(hidesTabBar("/admin/conversas/7"), true);
  assert.equal(hidesTabBar("/admin/conversas/7/"), true);
  assert.equal(hidesTabBar("/admin/conversas"), false);
  assert.equal(hidesTabBar("/admin/pedidos/7"), false);
});

test("a tela de entrada não tem moldura", () => {
  assert.equal(isBare("/admin/login"), true);
  assert.equal(isBare("/admin/hoje"), false);
});
