import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availabilityOf,
  balanceDueDate,
  calcQuote,
  canTransition,
  computeAlerts,
  computeKpis,
  DEFAULT_SETTINGS,
  normalizePhone,
  parseBRLToCents,
  parseSettings,
  RuleError,
  todayISO,
  validateSetting,
  isValidCpf,
  formatCpf,
} from "./rules.ts";

const carro = { serviceId: 1, name: "Carro da Noiva", priceCents: 260000 };
const saida = { serviceId: 2, name: "Saída dos Noivos", priceCents: 50000 };

test("orçamento soma serviços e calcula sinal de 50%", () => {
  const t = calcQuote([carro, saida], 0, 50);
  assert.equal(t.totalCents, 310000);
  assert.equal(t.depositCents, 155000);
  assert.equal(t.balanceCents, 155000);
});

test("desconto reduz o total e o sinal acompanha", () => {
  const t = calcQuote([carro], 10000, 50);
  assert.equal(t.totalCents, 250000);
  assert.equal(t.depositCents, 125000);
});

test("sinal com centavos arredonda e saldo fecha a conta", () => {
  const t = calcQuote([{ serviceId: null, name: "x", priceCents: 100001 }], 0, 30);
  assert.equal(t.depositCents + t.balanceCents, t.totalCents);
});

test("orçamento recusa desconto maior que o valor e lista vazia", () => {
  assert.throws(() => calcQuote([carro], 300000, 50), RuleError);
  assert.throws(() => calcQuote([], 0, 50), RuleError);
  assert.throws(() => calcQuote([carro], -1, 50), RuleError);
});

test("transições de status seguem o funil", () => {
  assert.ok(canTransition("novo", "orcamento_enviado"));
  assert.ok(canTransition("reservado", "confirmado"));
  assert.ok(canTransition("confirmado", "realizado"));
  assert.ok(canTransition("perdido", "novo"));
  assert.ok(!canTransition("novo", "confirmado"), "não confirma sem reservar");
  assert.ok(!canTransition("realizado", "cancelado"), "realizado é final");
  assert.ok(!canTransition("confirmado", "perdido"));
});

test("data ocupada por reserva confirmada, provisória ou bloqueio manual", () => {
  const facts = {
    blocked: ["2026-11-21"],
    reservations: [
      { date: "2026-12-05", kind: "confirmada", orderId: 1 },
      { date: "2026-12-12", kind: "provisoria", orderId: 2 },
    ],
  };
  assert.equal(availabilityOf("2026-12-05", facts).status, "ocupada");
  assert.equal(availabilityOf("2026-12-12", facts).status, "provisoria");
  assert.equal(availabilityOf("2026-11-21", facts).status, "ocupada");
  assert.equal(availabilityOf("2026-12-19", facts).status, "livre");
  // O próprio pedido não conflita com a sua reserva, mesmo com o bloqueio criado por ela.
  const own = { blocked: ["2026-12-05"], reservations: [{ date: "2026-12-05", kind: "confirmada", orderId: 1 }] };
  assert.equal(availabilityOf("2026-12-05", own, 1).status, "livre");
});

test("saldo vence N dias antes do evento, nunca no passado", () => {
  assert.equal(balanceDueDate("2026-12-19", 7, "2026-10-14"), "2026-12-12");
  assert.equal(balanceDueDate("2026-10-17", 7, "2026-10-14"), "2026-10-14");
});

test("hoje é calculado no fuso de São Paulo", () => {
  // 01:30 UTC de 15/10 ainda é 14/10 em São Paulo.
  assert.equal(todayISO(new Date("2026-10-15T01:30:00Z")), "2026-10-14");
});

test("telefone vira só dígitos com DDI", () => {
  assert.equal(normalizePhone("(54) 99999-1234"), "5554999991234");
  assert.equal(normalizePhone("+55 54 99999-1234"), "5554999991234");
});

test("valores em reais viram centavos", () => {
  assert.equal(parseBRLToCents("2.600,00"), 260000);
  assert.equal(parseBRLToCents("500"), 50000);
  assert.equal(parseBRLToCents("R$ 1.234,56"), 123456);
  assert.equal(parseBRLToCents(""), null);
});

test("configurações inválidas voltam ao padrão e validação barra absurdos", () => {
  const s = parseSettings([
    { key: "depositPercent", value: "30" },
    { key: "provisionalHours", value: "abc" },
    { key: "desconhecida", value: "1" },
  ]);
  assert.equal(s.depositPercent, 30);
  assert.equal(s.provisionalHours, DEFAULT_SETTINGS.provisionalHours);
  assert.equal(validateSetting("depositPercent", 120).ok, false);
  assert.equal(validateSetting("depositPercent", "40").ok, true);
  assert.equal(validateSetting("followUpDays", 1.5).ok, false);
});

test("alertas apontam conflito, atraso, vencimento e evento próximo", () => {
  const now = new Date("2026-10-14T15:00:00Z");
  const old = new Date("2026-10-01T12:00:00Z");
  const alerts = computeAlerts({
    now,
    settings: DEFAULT_SETTINGS,
    blocked: [],
    orders: [
      { id: 1, clientName: "Ana", status: "confirmado", eventDate: "2026-10-20", updatedAt: old, createdAt: old },
      { id: 2, clientName: "Bia", status: "novo", eventDate: "2026-10-20", updatedAt: now, createdAt: now },
      { id: 3, clientName: "Carla", status: "orcamento_enviado", eventDate: "2026-12-01", updatedAt: old, createdAt: old },
    ],
    reservations: [{ orderId: 1, date: "2026-10-20", kind: "confirmada", expiresAt: null }],
    payments: [
      { orderId: 1, kind: "saldo", amountCents: 130000, dueDate: "2026-10-13", status: "a_receber" },
      { orderId: 3, kind: "sinal", amountCents: 130000, dueDate: "2026-10-16", status: "a_receber" },
    ],
  });
  const types = alerts.map((a) => a.type);
  assert.ok(types.includes("data_em_conflito"));
  assert.ok(types.includes("pagamento_atrasado"));
  assert.ok(types.includes("pagamento_vencendo"));
  assert.ok(types.includes("orcamento_sem_resposta"));
  assert.ok(types.includes("evento_proximo"));
  assert.equal(alerts[0].severity, "urgente", "urgentes primeiro");
});

test("indicadores somam o mês corrente e a conversão", () => {
  const k = computeKpis({
    today: "2026-10-14",
    orders: [
      { status: "confirmado", createdAt: new Date("2026-10-02T12:00:00Z") },
      { status: "perdido", createdAt: new Date("2026-10-03T12:00:00Z") },
      { status: "orcamento_enviado", createdAt: new Date("2026-09-03T12:00:00Z") },
    ],
    quotes: [{ sentAt: new Date("2026-10-05T12:00:00Z"), createdAt: new Date("2026-10-05T12:00:00Z") }],
    payments: [
      { status: "recebido", amountCents: 130000, paidAt: new Date("2026-10-06T12:00:00Z") },
      { status: "recebido", amountCents: 50000, paidAt: new Date("2026-09-06T12:00:00Z") },
      { status: "a_receber", amountCents: 130000, paidAt: null },
      { status: "atrasado", amountCents: 20000, paidAt: null },
    ],
  });
  assert.equal(k.pedidosMes, 2);
  assert.equal(k.orcamentosMes, 1);
  assert.equal(k.aguardando, 1);
  assert.equal(k.conversao, 50);
  assert.equal(k.recebidoMesCents, 130000);
  assert.equal(k.aReceberCents, 150000);
  assert.equal(k.atrasadoCents, 20000);
});

test("padrão atual: sinal de 40% e saldo 1 dia antes (como nos termos)", () => {
  const t = calcQuote([carro, saida], 0, DEFAULT_SETTINGS.depositPercent);
  assert.equal(t.depositCents, 124000); // R$ 1.240 de R$ 3.100
  assert.equal(t.balanceCents, 186000);
  assert.equal(balanceDueDate("2026-12-05", DEFAULT_SETTINGS.balanceDaysBefore, "2026-10-14"), "2026-12-04");
});

test("WhatsApp nas Regras: liga/desliga e número do dono", () => {
  const s = parseSettings([
    { key: "margotWhatsapp", value: "0" },
    { key: "ownerDailySummary", value: "1" },
    { key: "ownerPhone", value: "51988887777" },
  ]);
  assert.equal(s.margotWhatsapp, false);
  assert.equal(s.ownerDailySummary, true);
  assert.equal(s.ownerPhone, "51988887777");
  // Padrões: Margot atende no WhatsApp e manda o resumo do dia
  assert.equal(parseSettings([]).margotWhatsapp, true);
  assert.equal(parseSettings([]).ownerDailySummary, true);
  assert.deepEqual(validateSetting("margotWhatsapp", false), { ok: true, value: "0" });
  assert.deepEqual(validateSetting("margotWhatsapp", "true"), { ok: true, value: "1" });
  assert.deepEqual(validateSetting("ownerPhone", "(51) 98888-7777"), { ok: true, value: "51988887777" });
  assert.deepEqual(validateSetting("ownerPhone", ""), { ok: true, value: "" });
  assert.equal(validateSetting("ownerPhone", "98888").ok, false);
});

test("CPF do termo: dígitos verificadores e formatação", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
  assert.equal(isValidCpf("52998224725"), true);
  assert.equal(isValidCpf("529.982.247-26"), false);
  assert.equal(isValidCpf("111.111.111-11"), false);
  assert.equal(isValidCpf("1234"), false);
  assert.equal(formatCpf("52998224725"), "529.982.247-25");
  assert.equal(formatCpf(" AB123456 "), "AB123456");
});
