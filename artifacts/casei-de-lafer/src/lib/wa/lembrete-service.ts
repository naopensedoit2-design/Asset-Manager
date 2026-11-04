// Envia os lembretes de lead parado (regras em lembrete.ts). Chamado sem pressa depois do webhook do WhatsApp,
// no máximo a cada 10 minutos: no plano Hobby da Vercel a rotina agendada só roda uma vez por dia.

import { prisma } from "@/lib/prisma";
import * as gestor from "@/lib/gestor/service";
import { waCanSend } from "./config";
import { precisaLembrete, textoLembrete } from "./lembrete";
import { sendText } from "./send";
import { contactLabel, isPaused } from "./store";
import { looksLikeLead } from "./triage";

const KEY = "lembretesUltimaRodada";
const CLOSED = ["reservado", "confirmado", "realizado", "perdido", "cancelado"];

export async function sendFollowUps(now = new Date()): Promise<{ enviados: number }> {
  if (!waCanSend()) return { enviados: 0 };
  // Trava simples: uma rodada a cada 10 minutos.
  const last = await prisma.setting.findUnique({ where: { key: KEY } });
  if (last && now.getTime() - new Date(last.value).getTime() < 10 * 60_000) return { enviados: 0 };
  await prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: now.toISOString() }, update: { value: now.toISOString() } });

  const settings = await gestor.getSettings();
  if (!settings.margotWhatsapp) return { enviados: 0 };

  const candidates = await prisma.waContact.findMany({
    where: {
      isOwner: false,
      ignoredAt: null,
      blockedAt: null,
      lastInboundAt: { gte: new Date(now.getTime() - 24 * 3_600_000), lte: new Date(now.getTime() - 4 * 3_600_000) },
    },
    include: { messages: { where: { type: { not: "reaction" } }, orderBy: { id: "desc" }, take: 30 } },
    take: 50,
  });

  let enviados = 0;
  for (const c of candidates) {
    const last = c.messages[0] ?? null;
    const order = c.orderId ? await prisma.order.findUnique({ where: { id: c.orderId }, select: { status: true } }) : null;
    const lembradoDepois = c.messages.some((m) => m.kind === "lembrete" && c.lastInboundAt && m.createdAt > c.lastInboundAt);
    const pareceLead = Boolean(c.orderId) || c.messages.some((m) => m.direction === "in" && looksLikeLead(m.text));
    const ok = precisaLembrete(
      {
        isOwner: c.isOwner,
        ignored: Boolean(c.ignoredAt),
        paused: isPaused(c, now),
        blocked: Boolean(c.blockedAt),
        lastInboundAt: c.lastInboundAt,
        last: last && { direction: last.direction, author: last.author, kind: last.kind, createdAt: last.createdAt },
        lembradoDepois,
        pedidoFechado: Boolean(order && CLOSED.includes(order.status)),
        pareceLead,
      },
      now,
    );
    if (!ok) continue;
    const name = c.name || (await contactLabel(c));
    const sent = await sendText(c, textoLembrete(name.startsWith("+") ? "" : name), { author: "margot", kind: "lembrete" });
    if (sent.ok) enviados++;
  }
  return { enviados };
}
