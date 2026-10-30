import { prisma } from "@/lib/prisma";
import { computeFinance, isExpenseCategory, categoryLabel } from "./finance";
import { planExpensePayment } from "./expense-split";
import { dateToISO, isDateString, RuleError, todayISO } from "./rules";

const toDbDate = (d: string) => new Date(`${d}T00:00:00Z`);

function requireDate(value: unknown, field: string): string {
  if (!isDateString(value)) throw new RuleError("data_invalida", `Informe ${field} no formato AAAA-MM-DD.`, 400);
  return value;
}

function str(v: unknown, max = 500) {
  return v === undefined || v === null ? "" : String(v).trim().slice(0, max);
}

// ─── Lançamentos iniciais ────────────────────────────────────
// Gastos do Lafer em 2026 tirados dos recibos da RM Nantal que o Leonardo enviou.
// Entram uma única vez, só se o financeiro estiver vazio; depois tudo é editável.
const INITIAL_KEY = "financeiroImportacaoInicial";
const INITIAL_EXPENSES = [
  {
    date: "2026-07-02",
    description: "Revisão geral: óleo, filtros, retentores, alternador, velas e óleo da caixa",
    category: "manutencao",
    supplier: "RM Nantal (Taquara)",
    amountCents: 247900,
    status: "pago",
    paidAt: "2026-07-02",
    notes: "Recibo de 02/07/2026, 49.425 km. Peças R$ 1.579 + mão de obra R$ 900.",
  },
  {
    date: "2026-08-28",
    description: "Retífica do motor: entrada",
    category: "manutencao",
    supplier: "RM Nantal (Taquara)",
    amountCents: 210000,
    status: "pago",
    paidAt: "2026-08-28",
    notes: "Retífica total R$ 15.182 (peças R$ 12.182 + mão de obra R$ 3.000), 50.223 km.",
  },
  {
    date: "2026-08-28",
    description: "Retífica do motor: pagamentos já feitos",
    category: "manutencao",
    supplier: "RM Nantal (Taquara)",
    amountCents: 650000,
    status: "pago",
    paidAt: null,
    notes: "Valor calculado: R$ 13.082 de saldo após a entrada menos R$ 6.582 que ainda faltam. Confirme as datas.",
  },
  {
    date: "2026-08-28",
    description: "Retífica do motor: saldo",
    category: "manutencao",
    supplier: "RM Nantal (Taquara)",
    amountCents: 658200,
    status: "a_pagar",
    paidAt: null,
    notes: "À vista com desconto de R$ 886 ficaria R$ 5.696.",
  },
  {
    date: "2026-10-14",
    description: "Guincho (estimativa do ano)",
    category: "guincho",
    supplier: "",
    amountCents: 50000,
    status: "pago",
    paidAt: null,
    notes: "Valor aproximado informado pelo Leonardo. Troque por cada guincho com data e valor.",
  },
];

async function ensureInitialExpenses() {
  const flag = await prisma.setting.findUnique({ where: { key: INITIAL_KEY } });
  if (flag) return;
  if ((await prisma.expense.count()) === 0) {
    await prisma.expense.createMany({
      data: INITIAL_EXPENSES.map((e) => ({
        ...e,
        date: toDbDate(e.date),
        paidAt: e.paidAt ? toDbDate(e.paidAt) : null,
        createdBy: "sistema",
      })),
    });
  }
  await prisma.setting.create({ data: { key: INITIAL_KEY, value: "1" } });
}

// ─── Despesas ────────────────────────────────────────────────

function serialize(e: Awaited<ReturnType<typeof prisma.expense.findFirst>> & {}) {
  return {
    id: e.id,
    date: dateToISO(e.date)!,
    description: e.description,
    category: e.category,
    categoryLabel: categoryLabel(e.category),
    supplier: e.supplier,
    amountCents: e.amountCents,
    status: e.status,
    dueDate: dateToISO(e.dueDate),
    paidAt: dateToISO(e.paidAt),
    notes: e.notes,
    orderId: e.orderId,
    createdBy: e.createdBy,
  };
}

export type ExpenseView = ReturnType<typeof serialize>;

export async function listExpenses(filter: { period?: unknown; status?: unknown } = {}) {
  await ensureInitialExpenses();
  const where: any = {};
  const period = str(filter.period, 7);
  if (/^\d{4}(-\d{2})?$/.test(period)) {
    const start = period.length === 4 ? `${period}-01-01` : `${period}-01`;
    const end =
      period.length === 4
        ? `${Number(period) + 1}-01-01`
        : (() => {
            const [y, m] = period.split("-").map(Number);
            return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
          })();
    // Mostra também o que está em aberto, mesmo de outros períodos.
    where.OR = [{ date: { gte: toDbDate(start), lt: toDbDate(end) } }, { status: "a_pagar" }];
  }
  if (filter.status === "pago" || filter.status === "a_pagar") where.status = filter.status;
  const rows = await prisma.expense.findMany({ where, orderBy: [{ date: "desc" }, { id: "desc" }] });
  return rows.map(serialize);
}

export async function saveExpense(input: Record<string, any>, actor: "admin" | "margot" = "admin") {
  const amountCents = Number(input.amountCents);
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new RuleError("valor_invalido", "Informe um valor maior que zero.", 400);
  }
  const description = str(input.description, 300);
  if (!description) throw new RuleError("descricao_obrigatoria", "Descreva o gasto.", 400);
  const status = input.status === "a_pagar" ? "a_pagar" : "pago";
  const date = input.date ? requireDate(input.date, "a data") : todayISO();
  const data = {
    date: toDbDate(date),
    description,
    category: isExpenseCategory(input.category) ? input.category : "outros",
    supplier: str(input.supplier, 200),
    amountCents,
    status,
    dueDate: status === "a_pagar" && input.dueDate ? toDbDate(requireDate(input.dueDate, "o vencimento")) : null,
    paidAt:
      status === "pago"
        ? input.paidAt
          ? toDbDate(requireDate(input.paidAt, "a data do pagamento"))
          : toDbDate(date)
        : null,
    notes: str(input.notes, 2000),
    orderId: Number.isInteger(input.orderId) ? input.orderId : null,
  };
  if (input.id) {
    const id = Number(input.id);
    const exists = await prisma.expense.findUnique({ where: { id } });
    if (!exists) throw new RuleError("despesa_nao_encontrada", "Despesa não encontrada.", 404);
    return serialize(await prisma.expense.update({ where: { id }, data }));
  }
  return serialize(await prisma.expense.create({ data: { ...data, createdBy: actor } }));
}

/**
 * Abate `paidCents` de uma conta em aberto (regra em expense-split.ts). Tudo numa transação: ou a
 * conta diminui E a parte paga é lançada, ou nada muda. A parte paga mantém a data do gasto original
 * (custo do carro) e leva a data do pagamento em `paidAt` (caixa).
 */
export async function payExpensePart(
  input: { id: number; paidCents: number; date: string; expectedCents?: number },
  actor: "admin" | "margot" = "admin",
) {
  const date = requireDate(input.date, "a data do pagamento");
  return prisma.$transaction(async (tx) => {
    const e = await tx.expense.findUnique({ where: { id: input.id } });
    if (!e) throw new RuleError("despesa_nao_encontrada", "Não achei essa conta.", 404);
    const plan = planExpensePayment(
      { description: e.description, amountCents: e.amountCents, status: e.status, notes: e.notes, supplier: e.supplier },
      input.paidCents,
      date,
      input.expectedCents,
    );
    if (plan.kind === "total") {
      const paid = await tx.expense.update({
        where: { id: e.id },
        data: { status: "pago", paidAt: toDbDate(date), dueDate: null, notes: plan.openNotes },
      });
      return { kind: "total" as const, open: null, paid: serialize(paid) };
    }
    const open = await tx.expense.update({
      where: { id: e.id },
      data: { amountCents: plan.remainingCents, notes: plan.openNotes },
    });
    const paid = await tx.expense.create({
      data: {
        date: e.date,
        description: plan.paidDescription,
        category: e.category,
        supplier: e.supplier,
        amountCents: input.paidCents,
        status: "pago",
        dueDate: null,
        paidAt: toDbDate(date),
        notes: plan.paidNotes,
        orderId: e.orderId,
        createdBy: actor,
      },
    });
    return { kind: "parcial" as const, open: serialize(open), paid: serialize(paid) };
  });
}

export async function deleteExpense(id: unknown) {
  const n = Number(id);
  const exists = await prisma.expense.findUnique({ where: { id: n } });
  if (!exists) throw new RuleError("despesa_nao_encontrada", "Despesa não encontrada.", 404);
  await prisma.expense.delete({ where: { id: n } });
  return { ok: true };
}

// ─── Resumo ──────────────────────────────────────────────────

export async function getFinance(periodRaw: unknown) {
  await ensureInitialExpenses();
  const today = todayISO();
  const period = /^\d{4}(-\d{2})?$/.test(String(periodRaw ?? "")) ? String(periodRaw) : today.slice(0, 4);
  const [expenses, payments, events] = await Promise.all([
    prisma.expense.findMany(),
    prisma.payment.findMany({ where: { status: { not: "cancelado" } } }),
    prisma.order.findMany({
      where: { status: { in: ["confirmado", "realizado"] }, eventDate: { not: null } },
      select: { eventDate: true },
    }),
  ]);
  return computeFinance({
    period,
    today,
    expenses: expenses.map((e) => ({
      date: dateToISO(e.date)!,
      category: e.category,
      amountCents: e.amountCents,
      status: e.status,
      paidAt: dateToISO(e.paidAt),
      dueDate: dateToISO(e.dueDate),
    })),
    // Pagamentos recebidos: a data do caixa é o dia em que foi marcado como recebido (fuso de SP).
    payments: payments.map((p) => ({
      amountCents: p.amountCents,
      status: p.status,
      paidAt: p.paidAt ? todayISO(p.paidAt) : null,
    })),
    events: events.map((o) => dateToISO(o.eventDate)!),
  });
}
