// Custo da Margot: cada chamada à API do Claude é registrada com os tokens usados.

import { prisma } from "@/lib/prisma";
import { TIMEZONE } from "@/lib/gestor/rules";

import { costMicroUsd } from "./pricing";

export interface CallUsage {
  model: string;
  inputTokens: number; // só o que não veio nem foi para o cache
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
}

export async function recordUsage(calls: CallUsage[], channel: "site" | "whatsapp", conversationId: string) {
  if (!calls.length) return;
  await prisma.aiUsage.createMany({
    data: calls.map((c) => ({
      channel,
      conversationId: conversationId.slice(0, 64),
      model: c.model,
      inputTokens: c.inputTokens,
      outputTokens: c.outputTokens,
      cacheWriteTokens: c.cacheWriteTokens ?? 0,
      cacheReadTokens: c.cacheReadTokens ?? 0,
      costMicroUsd: costMicroUsd(c.model, c.inputTokens, c.outputTokens, c.cacheWriteTokens ?? 0, c.cacheReadTokens ?? 0),
    })),
  });
}

/** Início do mês corrente no fuso de São Paulo, como instante UTC. */
function monthStart(now = new Date()): Date {
  const ym = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit" }).format(now);
  // 00:00 em São Paulo (UTC-3) = 03:00 UTC
  return new Date(`${ym}-01T03:00:00Z`);
}

export async function monthUsage(now = new Date()) {
  const since = monthStart(now);
  const [agg, conversations, byChannel] = await Promise.all([
    prisma.aiUsage.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { costMicroUsd: true, inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheWriteTokens: true },
      _count: true,
    }),
    prisma.aiUsage.findMany({
      where: { createdAt: { gte: since }, conversationId: { not: "" } },
      distinct: ["conversationId"],
      select: { conversationId: true },
    }),
    prisma.aiUsage.groupBy({
      by: ["channel"],
      where: { createdAt: { gte: since } },
      _sum: { costMicroUsd: true },
    }),
  ]);
  const micro = agg._sum.costMicroUsd ?? 0;
  const channelUsd = (name: string) => (byChannel.find((c) => c.channel === name)?._sum.costMicroUsd ?? 0) / 1_000_000;
  return {
    desde: since.toISOString(),
    usd: micro / 1_000_000,
    chamadas: agg._count,
    conversas: conversations.length,
    // Total de tokens lidos pelo modelo (inclui os que vieram do cache, que custam bem menos).
    tokensEntrada: (agg._sum.inputTokens ?? 0) + (agg._sum.cacheReadTokens ?? 0) + (agg._sum.cacheWriteTokens ?? 0),
    tokensDoCache: agg._sum.cacheReadTokens ?? 0,
    tokensSaida: agg._sum.outputTokens ?? 0,
    porCanal: { site: channelUsd("site"), whatsapp: channelUsd("whatsapp") },
  };
}

/** Limite 0 funciona como chave de desligar a Margot. */
export async function overMonthlyLimit(limitUsd: number): Promise<boolean> {
  if (!limitUsd || limitUsd <= 0) return true;
  const { usd } = await monthUsage();
  return usd >= limitUsd;
}
