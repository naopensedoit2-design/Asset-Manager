// Regras puras do financeiro. Regime de caixa para "entrou/saiu": conta a data
// em que o dinheiro realmente entrou (pagamento recebido) ou saiu (despesa paga).

export const EXPENSE_CATEGORIES = [
  { key: "manutencao", label: "Manutenção do Lafer", vehicle: true },
  { key: "guincho", label: "Guincho e reboque", vehicle: true },
  { key: "combustivel", label: "Combustível", vehicle: true },
  { key: "seguro", label: "Seguro e documentação", vehicle: true },
  { key: "estetica", label: "Estética, capota e decoração", vehicle: true },
  { key: "marketing", label: "Marketing e anúncios", vehicle: false },
  { key: "sistemas", label: "Sistemas, site e assinaturas", vehicle: false },
  { key: "outros", label: "Outros", vehicle: false },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["key"];

export function isExpenseCategory(v: unknown): v is ExpenseCategory {
  return EXPENSE_CATEGORIES.some((c) => c.key === v);
}

export function categoryLabel(key: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.key === key)?.label ?? "Outros";
}

const VEHICLE = new Set<string>(EXPENSE_CATEGORIES.filter((c) => c.vehicle).map((c) => c.key));

export interface FinanceExpense {
  date: string; // AAAA-MM-DD
  category: string;
  amountCents: number;
  status: "pago" | "a_pagar" | string;
  paidAt: string | null;
  dueDate: string | null;
}

export interface FinancePayment {
  amountCents: number;
  status: string;
  paidAt: string | null; // AAAA-MM-DD
}

export interface FinanceInput {
  /** "AAAA" para o ano inteiro ou "AAAA-MM" para um mês. */
  period: string;
  today: string;
  expenses: FinanceExpense[];
  payments: FinancePayment[];
  /** Datas (AAAA-MM-DD) de eventos confirmados ou realizados. */
  events: string[];
}

export interface FinanceSummary {
  period: string;
  entrouCents: number;
  saiuCents: number;
  resultadoCents: number;
  aReceberCents: number;
  aPagarCents: number;
  aPagarVencidoCents: number;
  porCategoria: { key: string; label: string; cents: number }[];
  custoVeiculoCents: number;
  eventos: number;
  custoPorEventoCents: number | null;
  meses: { mes: string; entrouCents: number; saiuCents: number }[];
}

const inPeriod = (date: string | null, period: string) => !!date && date.startsWith(period);

export function computeFinance(input: FinanceInput): FinanceSummary {
  const { period, today, expenses, payments, events } = input;

  const entrouCents = payments
    .filter((p) => p.status === "recebido" && inPeriod(p.paidAt, period))
    .reduce((s, p) => s + p.amountCents, 0);

  const saiuCents = expenses
    .filter((e) => e.status === "pago" && inPeriod(e.paidAt ?? e.date, period))
    .reduce((s, e) => s + e.amountCents, 0);

  // Compromissos em aberto não dependem do período: é o que existe hoje.
  const aReceberCents = payments
    .filter((p) => p.status === "a_receber" || p.status === "atrasado")
    .reduce((s, p) => s + p.amountCents, 0);
  const openExpenses = expenses.filter((e) => e.status === "a_pagar");
  const aPagarCents = openExpenses.reduce((s, e) => s + e.amountCents, 0);
  const aPagarVencidoCents = openExpenses
    .filter((e) => e.dueDate && e.dueDate < today)
    .reduce((s, e) => s + e.amountCents, 0);

  // Por categoria e custo do carro: competência (data do gasto), pago ou não.
  const competence = expenses.filter((e) => inPeriod(e.date, period));
  const byCat = new Map<string, number>();
  for (const e of competence) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amountCents);
  const porCategoria = [...byCat.entries()]
    .map(([key, cents]) => ({ key, label: categoryLabel(key), cents }))
    .sort((a, b) => b.cents - a.cents);
  const custoVeiculoCents = competence.filter((e) => VEHICLE.has(e.category)).reduce((s, e) => s + e.amountCents, 0);
  const totalGastos = competence.reduce((s, e) => s + e.amountCents, 0);

  const eventos = events.filter((d) => inPeriod(d, period)).length;

  // Série mensal (só faz sentido no ano).
  const meses: FinanceSummary["meses"] = [];
  if (period.length === 4) {
    for (let m = 1; m <= 12; m++) {
      const mes = `${period}-${String(m).padStart(2, "0")}`;
      meses.push({
        mes,
        entrouCents: payments
          .filter((p) => p.status === "recebido" && inPeriod(p.paidAt, mes))
          .reduce((s, p) => s + p.amountCents, 0),
        saiuCents: expenses
          .filter((e) => e.status === "pago" && inPeriod(e.paidAt ?? e.date, mes))
          .reduce((s, e) => s + e.amountCents, 0),
      });
    }
  }

  return {
    period,
    entrouCents,
    saiuCents,
    resultadoCents: entrouCents - saiuCents,
    aReceberCents,
    aPagarCents,
    aPagarVencidoCents,
    porCategoria,
    custoVeiculoCents,
    eventos,
    custoPorEventoCents: eventos > 0 ? Math.round(totalGastos / eventos) : null,
    meses,
  };
}
