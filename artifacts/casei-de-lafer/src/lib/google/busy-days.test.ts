import { test } from "node:test";
import assert from "node:assert/strict";
import { busyDays } from "./busy-days.ts";

test("eventos da agenda viram dias ocupados", () => {
  const days = busyDays([
    // Casamento já anotado na agenda, com horário (16h em SP)
    { id: "1", summary: "Casamento Ani & Joisson", start: { dateTime: "2026-12-05T16:00:00-03:00" }, end: { dateTime: "2026-12-05T19:00:00-03:00" } },
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
  assert.equal(days.find((d) => d.date === "2026-12-05")?.summary, "Casamento Ani & Joisson");
});
