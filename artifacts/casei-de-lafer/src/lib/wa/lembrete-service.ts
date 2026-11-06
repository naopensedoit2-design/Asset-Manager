// Envia os lembretes de lead parado (regras em lembrete.ts). Chamado sem pressa depois do webhook do WhatsApp,
// no máximo a cada 10 minutos: no plano Hobby da Vercel a rotina agendada só roda uma vez por dia.

import { prisma } from "@/lib/prisma";
import * as gestor from "@/lib/gestor/service";
import { waCanSend } from "./config";
import { falaDoServico, precisaLembrete, textoLembrete } from "./lembrete";
import { processContact } from "./process";
import { precisaResgate } from "./resgate";
import { sendText } from "./send";
import { contactLabel, isPaused } from "./store";

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
    const pareceLead = Boolean(c.orderId) || c.messages.some((m) => m.direction === "in" && falaDoServico(m.text));
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

const RESGATE_KEY = "resgateUltimaRodada";

/**
 * Mensagem que ficou sem resposta (a função foi cortada no meio ou a IA falhou): tenta responder de novo, uma vez.
 * Roda depois do webhook, no máximo a cada 2 minutos.
 */
export async function rescueUnanswered(now = new Date()): Promise<{ resgatadas: number }> {
  if (!waCanSend()) return { resgatadas: 0 };
  const last = await prisma.setting.findUnique({ where: { key: RESGATE_KEY } });
  if (last && now.getTime() - new Date(last.value).getTime() < 2 * 60_000) return { resgatadas: 0 };
  await prisma.setting.upsert({ where: { key: RESGATE_KEY }, create: { key: RESGATE_KEY, value: now.toISOString() }, update: { value: now.toISOString() } });

  const settings = await gestor.getSettings();
  const contacts = await prisma.waContact.findMany({
    where: { ignoredAt: null, blockedAt: null, lastInboundAt: { gte: new Date(now.getTime() - 61 * 60_000), lte: new Date(now.getTime() - 3 * 60_000) } },
    take: 30,
  });
  let resgatadas = 0;
  for (const c of contacts) {
    const lastIn = await prisma.waMessage.findFirst({ where: { contactId: c.id, direction: "in" }, orderBy: { id: "desc" } });
    if (!lastIn) continue;
    const outAfter = await prisma.waMessage.count({ where: { contactId: c.id, direction: "out", id: { gt: lastIn.id } } });
    const key = `resgate:${lastIn.id}`;
    const done = await prisma.setting.findUnique({ where: { key } });
    const ok = precisaResgate(
      {
        isOwner: c.isOwner,
        ignored: Boolean(c.ignoredAt),
        paused: isPaused(c, now),
        blocked: Boolean(c.blockedAt),
        margotOn: settings.margotWhatsapp,
        lastIn: { createdAt: lastIn.createdAt, handled: Boolean(lastIn.handledAt) },
        respondida: outAfter > 0,
        jaResgatada: Boolean(done),
      },
      now,
    );
    if (!ok) continue;
    await prisma.setting.create({ data: { key, value: now.toISOString() } }).catch(() => {});
    console.warn(`[whatsapp] resgate: contato ${c.id} sem resposta desde a mensagem ${lastIn.id}; tentando de novo`);
    // Reabre só o que veio depois da última resposta e responde agora.
    const lastOut = await prisma.waMessage.findFirst({ where: { contactId: c.id, direction: "out" }, orderBy: { id: "desc" }, select: { id: true } });
    await prisma.waMessage.updateMany({
      where: { contactId: c.id, direction: "in", id: { gt: lastOut?.id ?? 0 } },
      data: { handledAt: null },
    });
    await processContact({ contactId: c.id, messageId: lastIn.id, delayMs: 0 });
    resgatadas++;
  }
  return { resgatadas };
}
