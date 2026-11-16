// Corrigir ou apagar uma despesa já lançada (ex.: "a gasolina era de ontem", "era R$ 55, não 50").
// Regra pura, sem banco: a secretária propõe, o Leonardo confirma no botão e o código grava.
//
// Só mexe no que ele pediu (data, valor, descrição, categoria). Se a despesa paga tinha o pagamento
// no mesmo dia do gasto, o pagamento acompanha a data nova (caixa e custo continuam no mesmo dia).
// Ao confirmar, a despesa é conferida de novo: se mudou depois do botão, recusa.

import { appendNote } from "./expense-split.ts";
import { categoryLabel, isExpenseCategory } from "./finance.ts";
import { formatBRL, formatDateBR, RuleError } from "./rules.ts";

export interface StoredExpense {
  id: number;
  date: string; // AAAA-MM-DD
  description: string;
  category: string;
  supplier: string;
  amountCents: number;
  status: string; // "pago" | "a_pagar"
  dueDate: string | null;
  paidAt: string | null;
  notes: string;
  orderId: number | null;
}

/** O que o Leonardo pediu para mudar. Campo ausente fica como está. */
export interface ExpenseChanges {
  data?: string;
  valorCents?: number;
  descricao?: string;
  categoria?: string;
}

/** Como a despesa estava quando o botão foi mandado: se mudar, a confirmação é recusada. */
export interface ExpenseSnapshot {
  date: string;
  amountCents: number;
  description: string;
}

export const snapshotOf = (e: StoredExpense): ExpenseSnapshot => ({
  date: e.date,
  amountCents: e.amountCents,
  description: e.description,
});

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Só os campos que de fato mudam. Erro em texto (para a Margot perguntar) se nada muda ou algo é inválido. */
export function cleanChanges(e: StoredExpense, c: ExpenseChanges, today: string): ExpenseChanges | string {
  const out: ExpenseChanges = {};
  if (c.data !== undefined) {
    if (!ISO.test(c.data)) return "Data inválida. Pergunte a data certa.";
    if (e.status === "pago" && c.data > today) return "Despesa paga não pode ter data futura. Se ainda vai pagar, diga isso a ele.";
    if (c.data !== e.date) out.data = c.data;
  }
  if (c.valorCents !== undefined) {
    if (!Number.isInteger(c.valorCents) || c.valorCents <= 0) return "Valor inválido. Pergunte o valor certo.";
    if (c.valorCents !== e.amountCents) out.valorCents = c.valorCents;
  }
  if (c.descricao !== undefined) {
    const d = c.descricao.replace(/\s+/g, " ").trim().slice(0, 300);
    if (!d) return "Descrição vazia. Pergunte a descrição.";
    if (d !== e.description) out.descricao = d;
  }
  if (c.categoria !== undefined) {
    if (!isExpenseCategory(c.categoria)) return "Categoria inválida.";
    if (c.categoria !== e.category) out.categoria = c.categoria;
  }
  if (Object.keys(out).length === 0) return "Nada muda nessa despesa: ela já está assim. Pergunte o que ele quer corrigir.";
  return out;
}

/** Texto do botão de confirmação: como está → como fica. */
export function describeExpenseFix(e: StoredExpense, c: ExpenseChanges): string {
  const lines = [`Corrigir despesa: *${e.description}* (${formatBRL(e.amountCents)} · ${formatDateBR(e.date)})`];
  if (c.data) lines.push(`Data: ${formatDateBR(e.date)} → ${formatDateBR(c.data)}`);
  if (c.valorCents) lines.push(`Valor: ${formatBRL(e.amountCents)} → ${formatBRL(c.valorCents)}`);
  if (c.descricao) lines.push(`Descrição: ${e.description} → ${c.descricao}`);
  if (c.categoria) lines.push(`Categoria: ${categoryLabel(e.category)} → ${categoryLabel(c.categoria)}`);
  return lines.join("\n");
}

export function describeExpenseRemoval(e: StoredExpense): string {
  return [
    `Apagar despesa: *${e.description}*`,
    `Valor: ${formatBRL(e.amountCents)} · ${categoryLabel(e.category)}`,
    `Data: ${formatDateBR(e.date)} · ${e.status === "pago" ? "paga" : "a pagar"}`,
    "Ela sai do Financeiro de vez.",
  ].join("\n");
}

function checkUnchanged(e: StoredExpense, seen: ExpenseSnapshot) {
  if (e.date !== seen.date || e.amountCents !== seen.amountCents || e.description !== seen.description) {
    throw new RuleError("despesa_mudou", "Essa despesa mudou depois do botão. Me peça de novo, por favor.");
  }
}

/** Dados completos para gravar (saveExpense regrava tudo): o resto da despesa fica igual. */
export function planExpenseFix(e: StoredExpense, c: ExpenseChanges, seen: ExpenseSnapshot) {
  checkUnchanged(e, seen);
  const date = c.data ?? e.date;
  const paidFollows = e.status === "pago" && (!e.paidAt || e.paidAt === e.date);
  const what = [c.data && "data", c.valorCents && "valor", c.descricao && "descrição", c.categoria && "categoria"].filter(Boolean).join(", ");
  return {
    id: e.id,
    date,
    description: c.descricao ?? e.description,
    category: c.categoria ?? e.category,
    supplier: e.supplier,
    amountCents: c.valorCents ?? e.amountCents,
    status: e.status === "a_pagar" ? "a_pagar" : "pago",
    dueDate: e.status === "a_pagar" ? e.dueDate : null,
    paidAt: e.status === "pago" ? (paidFollows ? date : e.paidAt) : null,
    notes: appendNote(e.notes, `Corrigida pelo WhatsApp (Margot): ${what}.`),
    orderId: e.orderId,
  };
}

/** Confere antes de apagar. */
export function checkExpenseRemoval(e: StoredExpense, seen: ExpenseSnapshot) {
  checkUnchanged(e, seen);
}
