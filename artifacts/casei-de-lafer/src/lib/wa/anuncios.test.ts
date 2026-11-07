import { test } from "node:test";
import assert from "node:assert/strict";
import { resumirAnuncios, type ConversaDeAnuncio } from "./anuncios.ts";

const c = (adSourceId: string, orderStatus: string | null, adHeadline = ""): ConversaDeAnuncio => ({ adSourceId, adHeadline, orderStatus });

test("conta conversas, pedidos vivos e fechados por anúncio", () => {
  const r = resumirAnuncios([
    c("111", null, "Chegue em um clássico"),
    c("111", "novo"),
    c("111", "confirmado"),
    c("111", "cancelado"),
    c("222", "realizado", "Outro anúncio"),
  ]);
  assert.deepEqual(r.find((x) => x.id === "111"), { id: "111", titulo: "Chegue em um clássico", conversas: 4, pedidos: 2, fechados: 1 });
  assert.deepEqual(r.find((x) => x.id === "222"), { id: "222", titulo: "Outro anúncio", conversas: 1, pedidos: 1, fechados: 1 });
});

test("perdido e cancelado não contam como pedido nem como fechado", () => {
  const [r] = resumirAnuncios([c("1", "perdido"), c("1", "cancelado")]);
  assert.equal(r.conversas, 2);
  assert.equal(r.pedidos, 0);
  assert.equal(r.fechados, 0);
});

test("ordena por fechados, depois pedidos, depois conversas; sem id vira um grupo só", () => {
  const r = resumirAnuncios([c("a", null), c("a", null), c("a", null), c("b", "novo"), c("c", "confirmado"), c("", null), c("", null)]);
  assert.deepEqual(r.map((x) => x.id), ["c", "b", "a", "(sem código do anúncio)"]);
  assert.equal(r.find((x) => x.id === "(sem código do anúncio)")?.conversas, 2);
});

test("sem conversas, lista vazia", () => {
  assert.deepEqual(resumirAnuncios([]), []);
});
