// Tela "Hoje": junta o que já existe (pedidos, alertas, conversas, contas, Margot) num só pacote para o painel.
// Só leitura. A regra de quem entra na fila mora em hoje.ts (pura e testada).

import { prisma } from "@/lib/prisma";
import * as gestor from "@/lib/gestor/service";
import { dateToISO, todayISO } from "@/lib/gestor/rules";
import { monthUsage } from "@/lib/margot/usage";
import { parseAction } from "@/lib/wa/actions";
import { listConversations } from "@/lib/wa/admin";
import { waMissing } from "@/lib/wa/config";
import { buildQueue, buildStops, type HojeData, type PendingApproval, type WaitingConversation } from "./hoje";
import { buildRoutineRecord, parseRoutine, ROUTINE_KEY, type SummaryResult } from "./routine";

/** Confirmação pedida pela Margot vale por 3 dias (mesma regra de resolveAction). */
const APPROVAL_DAYS = 3;
/** Confirmações que a Margot propôs ao Leonardo e que ainda esperam o "sim". */
export async function pendingApprovals(now = new Date()): Promise<PendingApproval[]> {
  const owner = await prisma.waContact.findFirst({ where: { isOwner: true } });
  if (!owner) return [];
  const rows = await prisma.waMessage.findMany({
    where: {
      contactId: owner.id,
      kind: "confirmacao",
      action: { not: "" },
      actionDoneAt: null,
      createdAt: { gte: new Date(now.getTime() - APPROVAL_DAYS * 86_400_000) },
    },
    orderBy: { id: "desc" },
    take: 10,
  });
  return rows.filter((r) => parseAction(r.action)).map((r) => ({ id: r.id, text: r.text, createdAt: r.createdAt.toISOString() }));
}

/** Anota que a rotina das 7h rodou e o que aconteceu com o resumo (aparece em Conexões). */
export async function recordRoutine(summary: SummaryResult, now = new Date()): Promise<void> {
  const value = JSON.stringify(buildRoutineRecord(summary, now));
  await prisma.setting.upsert({ where: { key: ROUTINE_KEY }, create: { key: ROUTINE_KEY, value }, update: { value } });
}

export async function getHoje(now = new Date()): Promise<HojeData> {
  const today = todayISO(now);
  const since = new Date(now.getTime() - 24 * 3_600_000);

  const [dash, conversations, approvals, openBills, usage, replies, active, routine] = await Promise.all([
    gestor.getDashboard(now),
    listConversations(),
    pendingApprovals(now),
    prisma.expense.findMany({ where: { status: "a_pagar" }, orderBy: [{ dueDate: "asc" }, { id: "asc" }] }),
    monthUsage(now),
    prisma.waMessage.count({
      where: { direction: "out", author: "margot", status: { not: "falhou" }, createdAt: { gte: since }, contact: { isOwner: false } },
    }),
    prisma.waContact.count({ where: { isOwner: false, lastMessageAt: { gte: since } } }),
    prisma.setting.findUnique({ where: { key: ROUTINE_KEY } }),
  ]);

  const settings = dash.settings;
  const whatsappConfigured = waMissing().length === 0;

  const waiting: WaitingConversation[] = conversations
    .filter((c) => c.waiting)
    .map((c) => ({
      id: c.id,
      name: c.clientName ?? (c.name || c.phone),
      paused: c.paused,
      windowOpen: c.windowOpen,
      waitingSince: c.last?.at ?? c.lastMessageAt,
      lastText: c.last?.text ?? "",
    }));

  const fila = buildQueue({
    now,
    today,
    alerts: dash.alerts,
    approvals,
    conversations: waiting,
    bills: openBills.map((b) => ({ id: b.id, description: b.description, supplier: b.supplier, amountCents: b.amountCents, dueDate: dateToISO(b.dueDate) })),
    margotWhatsappOn: settings.margotWhatsapp,
    whatsappConfigured,
  });

  const record = parseRoutine(routine?.value);
  const overdue = openBills.filter((b) => b.dueDate && dateToISO(b.dueDate)! < today);

  return {
    hoje: today,
    agora: now.toISOString(),
    margot: {
      whatsappLigado: settings.margotWhatsapp,
      siteLigado: settings.margotSite,
      whatsappConfigurado: whatsappConfigured,
      iaPronta: Boolean(process.env["ANTHROPIC_API_KEY"]) && settings.margotLimitUsd > 0 && usage.usd < settings.margotLimitUsd,
      respostas24h: replies,
      conversasEmAndamento: active,
      usoUsd: usage.usd,
      limiteUsd: settings.margotLimitUsd,
    },
    fila,
    aprovacoes: approvals.length,
    conversasEsperando: waiting.length,
    dinheiro: {
      recebidoMesCents: dash.kpis.recebidoMesCents,
      aReceberCents: dash.kpis.aReceberCents,
      atrasadoCents: dash.kpis.atrasadoCents,
      aPagarCents: openBills.reduce((sum, b) => sum + b.amountCents, 0),
      aPagarVencidoCents: overdue.reduce((sum, b) => sum + b.amountCents, 0),
    },
    paradas: buildStops(dash.upcoming, today),
    rotina: { ultimaExecucao: record?.at ?? null, resumoEnviado: record?.resumoEnviado ?? null, detalhe: record?.detalhe ?? null },
  };
}
