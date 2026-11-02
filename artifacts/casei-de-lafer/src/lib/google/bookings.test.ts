import { test } from "node:test";
import assert from "node:assert/strict";
import { readAgenda, type GoogleEvent } from "./busy-days.ts";
import { bookings, cleanTitle, coupleName, orderDraft } from "./bookings.ts";

const day = (id: string, summary: string, date: string, extra: Partial<GoogleEvent> = {}): GoogleEvent => ({
  id,
  summary,
  start: { date },
  end: { date: new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) },
  ...extra,
});

test("cleanTitle tira só o nome do negócio no fim", () => {
  assert.equal(cleanTitle("Casamento Bia & Caio - Eu Casei de Lafer"), "Casamento Bia & Caio");
  assert.equal(cleanTitle("Entrega de noiva: Lara e Rafa (Eu Casei de Lafer)"), "Entrega de noiva: Lara e Rafa");
  assert.equal(cleanTitle("Casamento – Rafa e Cá – eu casei de lafer"), "Casamento – Rafa e Cá");
  assert.equal(cleanTitle("Casamento - Rafael Mendes Costa"), "Casamento - Rafael Mendes Costa");
  assert.equal(cleanTitle("Eu Casei de Lafer"), "Eu Casei de Lafer"); // nunca devolve texto vazio
});

test("bookings: os dois casamentos de dezembro do print viram duas paradas, com os outros eventos de fora", () => {
  const { items } = readAgenda([
    day("a", "Casamento Bia & Caio - Eu Casei de Lafer", "2026-12-05"),
    day("l1", "Comprar presente de aniversário", "2026-12-08"),
    day("l2", "Lembrete: Casamento - Rafael Mendes Costa", "2026-12-12"),
    day("l3", "Preparação e Confirmação: Lara e Rafa", "2026-12-12"),
    day("c1", "Casamento - Rafael Mendes Costa", "2026-12-19"),
    day("c2", "Entrega de noiva: Lara e Rafa (Eu Casei de Lafer)", "2026-12-19", { location: "Igreja Matriz, Taquara", htmlLink: "https://g.example/e/c2" }),
  ]);
  const list = bookings(items, "2026-11-02");
  assert.deepEqual(
    list.map((b) => [b.date, b.title, b.also]),
    [
      ["2026-12-05", "Casamento Bia & Caio", []],
      ["2026-12-19", "Entrega de noiva: Lara e Rafa", ["Casamento - Rafael Mendes Costa"]],
    ],
  );
  assert.equal(list[1].location, "Igreja Matriz, Taquara");
  assert.equal(list[1].link, "https://g.example/e/c2");
});

test("bookings: casamento marcado 'Disponível' aparece, mas só de hoje em diante", () => {
  const { items } = readAgenda([
    day("p", "Casamento já passou", "2026-10-31", { transparency: "transparent" }),
    day("h", "Casamento de hoje", "2026-11-02", { transparency: "transparent" }),
    day("f", "Casamento futuro", "2027-01-09", { transparency: "transparent" }),
  ]);
  assert.deepEqual(bookings(items, "2026-11-02").map((b) => b.date), ["2026-11-02", "2027-01-09"]);
});

test("bookings: hora vem do evento principal; dia inteiro fica sem hora", () => {
  const { items } = readAgenda([
    { id: "t", summary: "Casamento Bia", start: { dateTime: "2026-12-05T16:30:00-03:00" }, end: { dateTime: "2026-12-05T19:00:00-03:00" } },
    day("d", "Casamento Bia", "2026-12-12"),
  ]);
  assert.deepEqual(bookings(items, "2026-11-02").map((b) => b.time), ["16:30", ""]);
});

test("coupleName tira o rótulo do começo e deixa só quem casa", () => {
  assert.equal(coupleName("Casamento Bia & Caio"), "Bia & Caio");
  assert.equal(coupleName("Casamento Bia & Caio - Eu Casei de Lafer"), "Bia & Caio");
  assert.equal(coupleName("Entrega de noiva: Lara e Rafa (Eu Casei de Lafer)"), "Lara e Rafa");
  assert.equal(coupleName("Casamento - Rafael Mendes Costa"), "Rafael Mendes Costa");
  assert.equal(coupleName("Pré-wedding Nina e Théo"), "Nina e Théo");
  assert.equal(coupleName("Lucas e Nina"), "Lucas e Nina");
  assert.equal(coupleName("Casamento"), "Casamento"); // sem nome nenhum: devolve o que há
});

test("orderDraft: o que Novo pedido já traz (nome, data, hora, local e a origem nas observações)", () => {
  const { items } = readAgenda([
    day("c1", "Casamento - Rafael Mendes Costa", "2026-12-19"),
    day("c2", "Entrega de noiva: Lara e Rafa (Eu Casei de Lafer)", "2026-12-19", { location: "Igreja Matriz, Taquara" }),
  ]);
  const [b] = bookings(items, "2026-11-02");
  assert.equal(b.id, "c2");
  assert.deepEqual(orderDraft(b), {
    name: "Lara e Rafa",
    eventDate: "2026-12-19",
    eventTime: "",
    venue: "Igreja Matriz, Taquara",
    notes: "Veio da Google Agenda: Entrega de noiva: Lara e Rafa\nTambém no dia: Casamento - Rafael Mendes Costa",
  });
});
