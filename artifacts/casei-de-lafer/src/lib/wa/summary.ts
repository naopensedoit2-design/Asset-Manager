// Resumo do dia que a Margot manda ao Leonardo pela manhã (rotina diária da Vercel, 7h).
// Só manda quando há algo para ver: evento perto, alerta ou conversa esperando.

import { prisma } from "@/lib/prisma";
import * as gestor from "@/lib/gestor/service";
import { addDays, formatBRL, formatDateBR, TIMEZONE, todayISO } from "@/lib/gestor/rules";
import { waCanSend } from "./config";
import { linkButtonMessage } from "./client";
import { notifyOwner } from "./notify";
import { countByKind, monthStart, quotaReport } from "./quota";
import { contactLabel } from "./store";

export async function dailySummary(now = new Date()) {
  const today = todayISO(now);
  const tomorrow = addDays(today, 1);
  const d = await gestor.getDashboard(now);
  const waiting = await prisma.waContact.findMany({
    where: { isOwner: false, lastInboundAt: { gte: new Date(now.getTime() - 3 * 86_400_000) } },
    include: { messages: { where: { type: { not: "reaction" } }, orderBy: { id: "desc" }, take: 1 } },
  });
  const unanswered = await Promise.all(waiting.filter((c) => c.messages[0]?.direction === "in").map((c) => contactLabel(c)));

  // Margot desligada em Regras: o resumo lembra, para ela não ficar parada sem ninguém perceber.
  const settings = await gestor.getSettings();
  const botOff = !settings.margotWhatsapp;
  // Cota grátis de mensagens do mês (R19): só aparece a partir de 70%.
  const sent = await prisma.waMessage.groupBy({
    by: ["type"],
    where: { direction: "out", status: { in: ["enviada", "entregue", "lida"] }, createdAt: { gte: monthStart(today) } },
    _count: { _all: true },
  });
  const quota = quotaReport(countByKind(sent.map((r) => ({ type: r.type, n: r._count._all }))));

  const describe = (o: (typeof d.upcoming)[number]) =>
    `${o.client.name}${o.eventTime ? ` às ${o.eventTime}` : ""}${o.city ? ` em ${o.city}` : ""}`;
  const todays = d.upcoming.filter((o) => o.eventDate === today);
  const tomorrows = d.upcoming.filter((o) => o.eventDate === tomorrow);
  const alerts = d.alerts.filter((a) => a.type !== "evento_proximo").slice(0, 6);

  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: TIMEZONE }).format(now);
  const lines = [`☀️ *Bom dia, Leonardo!* ${weekday}, ${formatDateBR(today)}.`];
  if (todays.length) lines.push(`\n*Hoje:* ${todays.map(describe).join("; ")}`);
  if (tomorrows.length) lines.push(`*Amanhã:* ${tomorrows.map(describe).join("; ")}`);
  if (alerts.length) lines.push(`\n*Atenção*\n${alerts.map((a) => `• ${a.title}`).join("\n")}`);
  if (unanswered.length) lines.push(`\n*Esperando resposta no WhatsApp:* ${unanswered.slice(0, 5).join(", ")}`);
  if (botOff) lines.push("\n⏸️ *Margot desligada no WhatsApp* (Regras): as mensagens dos clientes só chegam para você.");
  if (quota.lines.length) lines.push(`\n${quota.lines.join("\n")}`);
  lines.push(`\nNo mês: recebido ${formatBRL(d.kpis.recebidoMesCents)} · a receber ${formatBRL(d.kpis.aReceberCents)}.`);

  const parts = [
    todays.length ? `hoje ${todays.map((o) => o.client.name).join(" e ")}` : "",
    tomorrows.length ? `amanhã ${tomorrows.map((o) => o.client.name).join(" e ")}` : "",
    alerts.length ? `${alerts.length} alerta${alerts.length > 1 ? "s" : ""}` : "",
    unanswered.length ? `${unanswered.length} conversa${unanswered.length > 1 ? "s" : ""} esperando` : "",
    botOff ? "Margot desligada" : "",
    quota.part,
  ].filter(Boolean);

  return { text: lines.join("\n"), line: `resumo do dia: ${parts.join(", ")}`, worthSending: parts.length > 0 };
}

/** Chamado pela rotina diária. Não manda nada se o WhatsApp ou o número do dono não estiverem configurados. */
export async function sendDailySummary(now = new Date()) {
  if (!waCanSend()) return { enviado: false, motivo: "WhatsApp não configurado" };
  const settings = await gestor.getSettings();
  if (!settings.ownerPhone) return { enviado: false, motivo: "Seu WhatsApp não está em Regras" };
  if (!settings.ownerDailySummary) return { enviado: false, motivo: "Resumo diário desligado em Regras" };
  const s = await dailySummary(now);
  if (!s.worthSending) return { enviado: false, motivo: "Nada para avisar hoje" };
  const site = gestor.siteUrl();
  const r = await notifyOwner({
    text: s.text,
    summary: s.line,
    kind: "resumo_diario",
    build: site ? () => linkButtonMessage(s.text, "Abrir o painel", `${site}/admin/hoje`) : undefined,
  });
  return { enviado: r.result === "enviado" || r.result === "modelo", como: r.result };
}
