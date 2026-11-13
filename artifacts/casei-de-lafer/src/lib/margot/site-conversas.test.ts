import assert from "node:assert/strict";
import { test } from "node:test";
import { GUARDA_DIAS, idDeConversa, limiteDeGuarda, resumir, textoParaGuardar, type Fala } from "./site-conversas.ts";

test("guarda por 6 meses: o limite fica 183 dias antes de agora", () => {
  const agora = new Date("2027-06-30T12:00:00Z");
  assert.equal(GUARDA_DIAS, 183);
  assert.equal(limiteDeGuarda(agora).toISOString(), "2026-12-29T12:00:00.000Z");
});

test("só aceita código de conversa simples, vindo do navegador", () => {
  assert.equal(idDeConversa("3f2b8c1e-1d2a-4b5c-9e8f-0a1b2c3d4e5f"), "3f2b8c1e-1d2a-4b5c-9e8f-0a1b2c3d4e5f");
  for (const ruim of ["", "curto", "a".repeat(81), "tem espaço aqui", "<script>", null, 42, undefined]) {
    assert.equal(idDeConversa(ruim), null, String(ruim));
  }
});

test("fala vazia não é guardada e fala longa é cortada", () => {
  assert.equal(textoParaGuardar("   "), "");
  assert.equal(textoParaGuardar(undefined), "");
  assert.equal(textoParaGuardar("x".repeat(5000)).length, 4000);
});

const fala = (conversationId: string, role: string, content: string, minuto: number, orderId: number | null = null): Fala => ({
  conversationId,
  role,
  content,
  orderId,
  createdAt: new Date(Date.UTC(2026, 10, 13, 12, minuto)),
});

test("junta as falas por conversa, da mais recente para a mais antiga", () => {
  const lista = resumir([
    fala("conversa-a", "cliente", "Quero ver a data 13/03/2027", 1),
    fala("conversa-a", "margot", "Está livre!", 2),
    fala("conversa-b", "cliente", "Quanto custa?", 5),
    fala("conversa-a", "margot", "Montei o orçamento.", 9, 42),
  ]);
  assert.deepEqual(lista.map((c) => c.id), ["conversa-a", "conversa-b"]);
  assert.equal(lista[0]?.falas, 3);
  assert.equal(lista[0]?.abertura, "Quero ver a data 13/03/2027");
  assert.equal(lista[0]?.pedido, 42);
  assert.equal(lista[1]?.pedido, null);
});

test("a abertura mostrada na lista é curta e numa linha só", () => {
  const [c] = resumir([fala("conversa-c", "cliente", `linha 1\n${"y".repeat(300)}`, 1)]);
  assert.ok(c && c.abertura.length <= 140 && !c.abertura.includes("\n"));
});
