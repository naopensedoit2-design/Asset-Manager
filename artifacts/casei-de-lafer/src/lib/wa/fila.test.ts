import { test } from "node:test";
import assert from "node:assert/strict";
import { ATRASO_MINIMO_MS, comHoraDoAviso, horaDoAviso } from "./fila.ts";
import type { OutMessage } from "./client.ts";

// Mesmo formato de client.ts (que não dá para importar no teste: usa o banco).
const textMessage = (body: string): OutMessage => ({ type: "text", text: { body, preview_url: true } });
const imageMessage = (id: string, caption: string): OutMessage => ({ type: "image", image: { id, caption } });
const buttonsMessage = (body: string, buttons: { id: string; title: string }[]): OutMessage => ({
  type: "interactive",
  interactive: {
    type: "button",
    body: { text: body },
    action: { buttons: buttons.map((b) => ({ type: "reply", reply: b })) },
  },
});

// 25/11/2026 17:32 UTC = 14:32 em São Paulo.
const criado = new Date("2026-11-25T17:32:00Z");

test("hora no fuso de São Paulo, dd/mm", () => {
  assert.equal(horaDoAviso(criado), "25/11 às 14:32");
  assert.equal(horaDoAviso(new Date("2026-01-05T03:05:00Z")), "05/01 às 00:05");
});

test("aviso recente sai como está", () => {
  const m = textMessage("Erro na conversa");
  const agora = new Date(criado.getTime() + ATRASO_MINIMO_MS - 1);
  assert.deepEqual(comHoraDoAviso(m, criado, agora), m);
});

test("texto atrasado ganha a hora em que aconteceu", () => {
  const m = textMessage("💬 Cliente Teste: oi");
  const out = comHoraDoAviso(m, criado, new Date("2026-11-26T10:00:00Z"));
  assert.equal((out["text"] as { body: string }).body, "🕓 Aviso de 25/11 às 14:32\n💬 Cliente Teste: oi");
  assert.equal((m["text"] as { body: string }).body, "💬 Cliente Teste: oi", "não altera o original");
});

test("mensagem com botões atrasada mantém os botões e ganha a hora", () => {
  const m = buttonsMessage("Lançar pagamento?", [{ id: "ok:1", title: "Confirmar" }]);
  const out = comHoraDoAviso(m, criado, new Date("2026-11-26T10:00:00Z"));
  const inter = out["interactive"] as { body: { text: string }; action: unknown };
  assert.equal(inter.body.text, "🕓 Aviso de 25/11 às 14:32\nLançar pagamento?");
  assert.deepEqual(inter.action, (m["interactive"] as { action: unknown }).action);
});

test("mídia e texto no limite saem iguais", () => {
  const agora = new Date("2026-11-26T10:00:00Z");
  const img = imageMessage("midia-1", "legenda");
  assert.deepEqual(comHoraDoAviso(img, criado, agora), img);
  const cheio = buttonsMessage("x".repeat(1024), [{ id: "a", title: "A" }]);
  assert.deepEqual(comHoraDoAviso(cheio, criado, agora), cheio);
});
