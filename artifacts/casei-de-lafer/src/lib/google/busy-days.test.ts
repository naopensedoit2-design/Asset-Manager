import { test } from "node:test";
import assert from "node:assert/strict";
import { busyDays, kindOf, readAgenda, type GoogleEvent } from "./busy-days.ts";

test("eventos da agenda viram dias ocupados", () => {
  const days = busyDays([
    // Casamento já anotado na agenda, com horário (16h em SP)
    { id: "1", summary: "Casamento Bia & Caio", start: { dateTime: "2026-12-05T16:00:00-03:00" }, end: { dateTime: "2026-12-05T19:00:00-03:00" } },
    // Dia inteiro
    { id: "2", summary: "Paula & David", start: { date: "2026-12-19" }, end: { date: "2026-12-20" } },
    // Viagem de 3 dias (fim exclusivo)
    { id: "3", summary: "Viagem", start: { date: "2027-01-10" }, end: { date: "2027-01-13" } },
    // Marcado como "Disponível": não bloqueia
    { id: "4", summary: "Lembrete", transparency: "transparent", start: { date: "2026-12-06" }, end: { date: "2026-12-07" } },
    // Cancelado: não bloqueia
    { id: "5", status: "cancelled", start: { date: "2026-12-07" }, end: { date: "2026-12-08" } },
    // Criado pelo próprio site: já existe reserva no banco
    { id: "6", summary: "💍 Carro da Noiva", extendedProperties: { private: { ecdlOrderId: "9" } }, start: { date: "2026-12-12" }, end: { date: "2026-12-13" } },
    // Rotina que se repete todo dia: não bloqueia
    { id: "8", summary: "Academia", recurringEventId: "r1", start: { dateTime: "2026-12-08T07:00:00-03:00" }, end: { dateTime: "2026-12-08T08:00:00-03:00" } },
    { id: "9", summary: "Trabalho", recurringEventId: "r2", start: { date: "2026-12-09" }, end: { date: "2026-12-10" } },
    // Evento gigante de dia inteiro (mais de 30 dias): ignorado
    { id: "10", summary: "Temporada de casamentos", start: { date: "2026-10-01" }, end: { date: "2027-03-01" } },
    // 23h em SP já é outro dia em UTC: deve contar o dia de SP
    { id: "7", summary: "Noite", start: { dateTime: "2026-11-20T23:00:00-03:00" }, end: { dateTime: "2026-11-20T23:30:00-03:00" } },
  ]);
  assert.deepEqual(
    days.map((d) => d.date),
    ["2026-11-20", "2026-12-05", "2026-12-19", "2027-01-10", "2027-01-11", "2027-01-12"],
  );
  assert.equal(days.find((d) => d.date === "2026-12-05")?.summary, "Casamento Bia & Caio");
});

// ─── casamento x lembrete x o resto ──────────────────────────

test("kindOf: casamento, lembrete e o resto", () => {
  for (const t of [
    "Casamento Bia & Caio - Eu Casei de Lafer",
    "Casamento - Rafael Mendes Costa",
    "Entrega de noiva: Lara e Rafa (Eu Casei de Lafer)",
    "Ensaio Pré-Wedding - Camila e Rafael",
    "ENSAIO SOLO",
    "💍 Carro da Noiva — Ana",
  ]) {
    assert.equal(kindOf(t), "casamento", t);
  }
  for (const t of [
    "Lembrete: Casamento - Rafael Mendes Costa",
    "Lembrete 10 dias: Entrega de noiva Lara e Rafa",
    "Preparação e Confirmação: Lara e Rafa",
  ]) {
    assert.equal(kindOf(t), "lembrete", t);
  }
  for (const t of ["Renovar seguro do carro", "Checar CASAMENTOS.com.br", "Comprar presente de aniversário", "Dentista", "Compromisso"]) {
    assert.equal(kindOf(t), "outro", t);
  }
});

test("casamento anotado como dia inteiro e 'Disponível' (o padrão do Google) trava o dia mesmo assim", () => {
  const read = readAgenda([
    { id: "a", summary: "Casamento Bia & Caio - Eu Casei de Lafer", transparency: "transparent", start: { date: "2026-12-05" }, end: { date: "2026-12-06" } },
    { id: "b", summary: "Aniversário do vizinho", transparency: "transparent", start: { date: "2026-12-06" }, end: { date: "2026-12-07" } },
  ]);
  assert.deepEqual(read.days.map((d) => d.date), ["2026-12-05"]);
  assert.equal(read.days[0].kind, "casamento");
  const outro = read.items.find((i) => i.id === "b")!;
  assert.equal(outro.blocks, false);
  assert.equal(outro.ignoredBecause, "disponivel");
});

test("lembrete de casamento não trava o dia, mesmo marcado como 'Ocupado'", () => {
  const read = readAgenda([
    { id: "1", summary: "Lembrete: Casamento - Rafael Mendes Costa", start: { date: "2026-12-12" }, end: { date: "2026-12-13" } },
    { id: "2", summary: "Preparação e Confirmação: Lara e Rafa", start: { date: "2026-12-12" }, end: { date: "2026-12-13" } },
    { id: "3", summary: "Casamento - Rafael Mendes Costa", start: { date: "2026-12-19" }, end: { date: "2026-12-20" } },
  ]);
  assert.deepEqual(read.days.map((d) => d.date), ["2026-12-19"]);
  assert.deepEqual(read.items.filter((i) => !i.blocks).map((i) => i.ignoredBecause), ["lembrete", "lembrete"]);
});

test("dois compromissos no mesmo dia: aparece o nome do casamento, não o do compromisso pessoal", () => {
  const days = busyDays([
    { id: "iptu", summary: "Renovar seguro do carro", start: { dateTime: "2026-12-19T11:15:00-03:00" }, end: { dateTime: "2026-12-19T12:00:00-03:00" } },
    { id: "ced", summary: "Entrega de noiva: Lara e Rafa (Eu Casei de Lafer)", start: { date: "2026-12-19" }, end: { date: "2026-12-20" } },
  ]);
  assert.equal(days.length, 1);
  assert.equal(days[0].summary, "Entrega de noiva: Lara e Rafa (Eu Casei de Lafer)");
  assert.equal(days[0].eventId, "ced");
});

test("os compromissos guardam hora, local e link; evento de dia inteiro não tem hora", () => {
  const { items } = readAgenda([
    {
      id: "t",
      summary: "Casamento Bia & Caio",
      location: " Capela Santo Antônio, Gramado ",
      htmlLink: "https://www.google.com/calendar/event?eid=abc",
      start: { dateTime: "2026-12-05T16:30:00-03:00" },
      end: { dateTime: "2026-12-05T19:00:00-03:00" },
    },
    { id: "d", summary: "Viagem", start: { date: "2027-01-10" }, end: { date: "2027-01-13" } },
  ]);
  const t = items.find((i) => i.id === "t")!;
  assert.deepEqual([t.date, t.endDate, t.time, t.allDay, t.location, t.link], ["2026-12-05", "2026-12-05", "16:30", false, "Capela Santo Antônio, Gramado", "https://www.google.com/calendar/event?eid=abc"]);
  const d = items.find((i) => i.id === "d")!;
  assert.deepEqual([d.date, d.endDate, d.time, d.allDay], ["2027-01-10", "2027-01-12", "", true]); // fim exclusivo no Google
});

test("hora e dia são os de São Paulo, não os do UTC", () => {
  const { items } = readAgenda([{ id: "n", summary: "Noite", start: { dateTime: "2026-11-21T02:15:00Z" }, end: { dateTime: "2026-11-21T03:00:00Z" } }]);
  assert.deepEqual([items[0].date, items[0].time], ["2026-11-20", "23:15"]);
});

test("contagem do que foi lido e do que ficou de fora", () => {
  const events: GoogleEvent[] = [
    { id: "1", summary: "Casamento A", start: { date: "2026-12-05" }, end: { date: "2026-12-06" } },
    { id: "2", summary: "Rotina", recurringEventId: "r", start: { date: "2026-12-05" }, end: { date: "2026-12-06" } },
    { id: "3", summary: "Rotina", recurringEventId: "r", start: { date: "2026-12-06" }, end: { date: "2026-12-07" } },
    { id: "4", status: "cancelled", start: { date: "2026-12-07" }, end: { date: "2026-12-08" } },
    { id: "5", summary: "💍 Carro da Noiva", extendedProperties: { private: { ecdlOrderId: "7" } }, start: { date: "2026-12-12" }, end: { date: "2026-12-13" } },
    { id: "6", summary: "Sem data" },
  ];
  assert.deepEqual(readAgenda(events).counts, { eventos: 6, unicos: 1, repetidos: 2, cancelados: 1, doSite: 1 });
});

test("evento com fim antes do começo não quebra nem some", () => {
  const days = busyDays([{ id: "x", summary: "Estranho", start: { dateTime: "2026-12-05T16:00:00-03:00" }, end: { dateTime: "2026-12-05T10:00:00-03:00" } }]);
  assert.deepEqual(days.map((d) => d.date), ["2026-12-05"]);
});

test("no dia com o casamento e a entrega da noiva, o nome do dia é o da entrega (cita o negócio)", () => {
  const days = busyDays([
    { id: "c", summary: "Casamento - Rafael Mendes Costa", start: { date: "2026-12-19" }, end: { date: "2026-12-20" } },
    { id: "e", summary: "Entrega de noiva: Lara e Rafa (Eu Casei de Lafer)", transparency: "transparent", start: { date: "2026-12-19" }, end: { date: "2026-12-20" } },
  ]);
  assert.deepEqual(days.map((d) => [d.date, d.eventId]), [["2026-12-19", "e"]]);
});
