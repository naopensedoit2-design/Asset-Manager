import { NextRequest } from "next/server";
import { fail, ok, readJson, route } from "@/lib/gestor/http";
import { chat, type ChatMessage } from "@/lib/margot/agent";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/gestor/service";
import { overMonthlyLimit, recordUsage } from "@/lib/margot/usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_MESSAGES = 40;
const MAX_CHARS = 1500;

// Limite simples por IP (melhor esforço: cada instância da Vercel tem sua própria memória).
const hits = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + 10 * 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 40;
}

async function whatsappUrl(orderId: number | null, name?: string) {
  const cfg = await prisma.siteConfig.findFirst().catch(() => null);
  const number = cfg?.whatsappNumber || process.env["WHATSAPP_NUMBER"] || "";
  const text = orderId
    ? `Olá, Leonardo! ${name ? `Aqui é ${name}. ` : ""}Fiz o orçamento com a Margot pelo site (pedido #${orderId}) e quero garantir a data.`
    : "Olá! Estava falando com a Margot no site e gostaria de continuar o atendimento por aqui.";
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

function cleanHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const msgs = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, MAX_CHARS) }) as ChatMessage)
    .filter((m) => m.content.trim())
    .slice(-MAX_MESSAGES);
  // A API exige começar com o cliente e alternar os papéis.
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  const alternated: ChatMessage[] = [];
  for (const m of msgs) {
    const last = alternated[alternated.length - 1];
    if (last && last.role === m.role) last.content += `\n${m.content}`;
    else alternated.push({ ...m });
  }
  return alternated;
}

export const POST = route(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return fail("muitas_mensagens", "Muitas mensagens em pouco tempo. Tente de novo em alguns minutos.", 429);

  const body = await readJson(req);
  const history = cleanHistory(body.messages);
  if (!history.length || history[history.length - 1].role !== "user") {
    return fail("sem_mensagem", "Escreva uma mensagem.", 400);
  }
  // Só aceita o pedido informado pelo navegador se for um pedido recente da própria Margot.
  let orderId: number | null = null;
  if (Number.isInteger(body.orderId)) {
    const o = await prisma.order.findUnique({ where: { id: body.orderId as number } });
    if (o && o.createdBy === "margot" && o.createdAt.getTime() > Date.now() - 3 * 86_400_000) orderId = o.id;
  }

  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const settings = await getSettings();
  // Chave "Margot responde no chat do site" desligada (Regras ou "pausar Margot" pelo WhatsApp): não chama a IA.
  if (!settings.margotSite || !process.env["ANTHROPIC_API_KEY"] || (await overMonthlyLimit(settings.margotLimitUsd))) {
    return ok({
      reply: "Nosso atendimento automático está em manutenção agora. Fale com o Leonardo pelo WhatsApp, ele responde rapidinho.",
      orderId,
      encaminhado: true,
      whatsappUrl: await whatsappUrl(orderId),
    });
  }

  const usage: Parameters<typeof recordUsage>[0] = [];
  try {
    const result = await chat(history, orderId, usage);
    let name: string | undefined;
    if (result.orderId) {
      const order = await prisma.order.findUnique({ where: { id: result.orderId }, include: { client: true } });
      name = order?.client.name.split(" ")[0];
    }
    const { usage: _usage, ...publicResult } = result;
    return ok({ ...publicResult, whatsappUrl: await whatsappUrl(result.orderId, name) });
  } catch (e) {
    console.error("[margot]", e);
    return ok({
      reply: "Tive um probleminha para responder agora. Se preferir, continue com o Leonardo pelo WhatsApp.",
      orderId,
      encaminhado: true,
      whatsappUrl: await whatsappUrl(orderId),
    });
  } finally {
    // Registra o custo mesmo quando a conversa falha no meio.
    await recordUsage(usage, "site", conversationId).catch((e) => console.error("[margot] uso", e));
  }
});
