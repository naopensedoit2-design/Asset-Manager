// Abater parte de uma conta a pagar (ex.: "paguei R$ 1.500 da retífica"). Regra pura, sem banco.
//
// O modelo `Expense` não tem pagamento parcial (status só `pago` ou `a_pagar`). O abatimento é feito
// por divisão: a conta em aberto diminui e nasce uma despesa paga com a parte abatida. Para o
// Financeiro nada se perde nem se conta duas vezes:
//   • "Saiu" (caixa) soma a parte paga na data do pagamento (`paidAt`);
//   • "Custo do Lafer" (competência) continua com a data do gasto original (`date`);
//   • o total (pago + a pagar) da conta é o mesmo de antes.
// Se o valor abatido for igual ao saldo, a conta inteira é quitada (sem criar despesa nova).

import { formatBRL, formatDateBR, RuleError } from "./rules.ts";

const NOTES_MAX = 2000;
const DESCRIPTION_MAX = 300;
const SUFFIX = " (abatimento)";

export interface OpenExpense {
  description: string;
  amountCents: number;
  status: string;
  notes: string;
  supplier?: string;
}

export type ExpensePayment =
  | { kind: "total"; openNotes: string }
  | { kind: "parcial"; remainingCents: number; openNotes: string; paidDescription: string; paidNotes: string };

/** Acrescenta um registro às observações sem passar do limite (se passar, perde o começo mais antigo). */
export function appendNote(notes: string, addition: string, max = NOTES_MAX): string {
  const base = (notes ?? "").trim();
  const joined = base ? `${base} ${addition}` : addition;
  return joined.length <= max ? joined : joined.slice(joined.length - max);
}

/**
 * Decide o que acontece quando `paidCents` é pago de uma conta em aberto, em `payDate` (AAAA-MM-DD).
 * `expectedCents` é o saldo que o Leonardo viu na confirmação: se a conta mudou desde então, recusa.
 */
export function planExpensePayment(
  e: OpenExpense,
  paidCents: number,
  payDate: string,
  expectedCents?: number,
): ExpensePayment {
  if (e.status !== "a_pagar") throw new RuleError("ja_paga", "Essa conta já está paga.");
  if (!Number.isInteger(paidCents) || paidCents <= 0) throw new RuleError("valor_invalido", "Informe um valor maior que zero.");
  if (expectedCents !== undefined && expectedCents !== e.amountCents) {
    throw new RuleError("conta_mudou", `O valor dessa conta mudou (agora é ${formatBRL(e.amountCents)}). Me peça de novo.`);
  }
  if (paidCents > e.amountCents) {
    throw new RuleError("valor_maior", `O valor é maior que o saldo da conta (${formatBRL(e.amountCents)}).`);
  }
  const when = formatDateBR(payDate);

  if (paidCents === e.amountCents) {
    return { kind: "total", openNotes: appendNote(e.notes, `Quitada em ${when} pelo WhatsApp (Margot).`) };
  }
  return {
    kind: "parcial",
    remainingCents: e.amountCents - paidCents,
    openNotes: appendNote(e.notes, `Abatidos ${formatBRL(paidCents)} em ${when} (o saldo era ${formatBRL(e.amountCents)}).`),
    paidDescription: `${e.description.slice(0, DESCRIPTION_MAX - SUFFIX.length)}${SUFFIX}`,
    paidNotes: appendNote(
      "",
      `Parte de "${e.description}" (antes ${formatBRL(e.amountCents)}), abatida pelo WhatsApp (Margot). O restante ficou na conta em aberto.`,
    ),
  };
}

/** Texto da confirmação que o Leonardo recebe antes de abater (WhatsApp: *negrito*). */
export function describeExpensePayment(e: OpenExpense, paidCents: number, payDate: string): string {
  const plan = planExpensePayment(e, paidCents, payDate);
  const who = e.supplier ? ` (${e.supplier})` : "";
  const when = formatDateBR(payDate);
  if (plan.kind === "total") {
    return [`Quitar a conta *${e.description}*${who}`, `Valor: ${formatBRL(e.amountCents)}`, `Pago em ${when}.`].join("\n");
  }
  return [
    `Abater *${formatBRL(paidCents)}* da conta *${e.description}*${who}`,
    `Saldo: ${formatBRL(e.amountCents)} → fica ${formatBRL(plan.remainingCents)} em aberto`,
    `Pago em ${when}. O custo total não muda.`,
  ].join("\n");
}
