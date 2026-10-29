// O que o painel (/admin/conversas) precisa: lista de conversas, histórico, resposta do Leonardo e pausa da Margot.

import { prisma } from "@/lib/prisma";
import { RuleError, STATUS_LABELS, type OrderStatus } from "@/lib/gestor/rules";
import { siteUrl } from "@/lib/gestor/service";
import { explainError, phoneExtras, phoneInfo, registerNumber, subscribeApp, type PhoneExtras } from "./client";
import { waCanSend, waConfig, waMissing } from "./config";
import { truncate } from "./format";
import { notifyOwner } from "./notify";
import { formatPhone, phoneVariants } from "./phone";
import { sendText } from "./send";
import { isPaused, ownerPhone, PAUSED_FOREVER, windowOpen, type WaContact } from "./store";
import { voiceReady } from "./voice";

/** Ao responder pelo painel, a Margot fica quieta nesta conversa por este tempo. */
const MANUAL_PAUSE_HOURS = 24;

async function orderInfo(contact: WaContact) {
  if (!contact.orderId) return null;
  const o = await prisma.order.findUnique({ where: { id: contact.orderId }, select: { id: true, status: true, eventDate: true } });
  return o ? { id: o.id, status: o.status, statusLabel: STATUS_LABELS[o.status as OrderStatus] ?? o.status, eventDate: o.eventDate?.toISOString().slice(0, 10) ?? null } : null;
}

function contactView(c: WaContact) {
  return {
    id: c.id,
    name: c.name,
    phone: formatPhone(c.waId),
    waId: c.waId,
    isOwner: c.isOwner,
    paused: isPaused(c),
    pausedUntil: isPaused(c) && c.pausedUntil! < PAUSED_FOREVER ? c.pausedUntil!.toISOString() : null,
    windowOpen: windowOpen(c),
    unread: c.unread,
    lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    lastInboundAt: c.lastInboundAt?.toISOString() ?? null,
  };
}

export async function listConversations(filter: { orderId?: number } = {}) {
  let where = {};
  if (filter.orderId) {
    const o = await prisma.order.findUnique({ where: { id: filter.orderId }, include: { client: true } });
    if (!o) return [];
    where = { OR: [{ orderId: o.id }, { waId: { in: phoneVariants(o.client.phone) } }] };
  }
  const contacts = await prisma.waContact.findMany({
    where,
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    take: 100,
    // Última mensagem que conta (reação não pede resposta).
    include: { messages: { where: { type: { not: "reaction" } }, orderBy: { id: "desc" }, take: 1 } },
  });
  const clients = await prisma.client.findMany({
    where: { id: { in: contacts.map((c) => c.clientId).filter((n): n is number => n !== null) } },
    select: { id: true, name: true },
  });
  return Promise.all(
    contacts.map(async (c) => {
      const last = c.messages[0];
      return {
        ...contactView(c),
        clientName: clients.find((x) => x.id === c.clientId)?.name ?? null,
        order: await orderInfo(c),
        last: last
          ? {
              direction: last.direction,
              author: last.author,
              type: last.type,
              text: truncate(last.text || "", 140),
              status: last.status,
              at: last.createdAt.toISOString(),
            }
          : null,
        waiting: last?.direction === "in" && !c.isOwner,
      };
    }),
  );
}

export async function getConversation(id: number) {
  const contact = await prisma.waContact.findUnique({ where: { id } });
  if (!contact) throw new RuleError("conversa_nao_encontrada", "Conversa não encontrada.", 404);
  const messages = await prisma.waMessage.findMany({ where: { contactId: id }, orderBy: { id: "desc" }, take: 200 });
  messages.reverse();
  const client = contact.clientId
    ? await prisma.client.findUnique({ where: { id: contact.clientId }, select: { name: true } })
    : null;
  return {
    contact: { ...contactView(contact), clientName: client?.name ?? null, order: await orderInfo(contact) },
    messages: messages
      .filter((m) => m.status !== "rascunho")
      .map((m) => ({
        id: m.id,
        direction: m.direction,
        author: m.author,
        type: m.type,
        kind: m.kind,
        text: m.text,
        mediaId: m.mediaId,
        mediaMime: m.mediaMime,
        fileName: m.fileName,
        status: m.status,
        error: m.error,
        createdAt: m.createdAt.toISOString(),
      })),
  };
}

export async function markConversationRead(id: number) {
  await prisma.waContact.update({ where: { id }, data: { unread: 0 } });
}

export async function unreadTotal() {
  const agg = await prisma.waContact.aggregate({ where: { isOwner: false }, _sum: { unread: true } });
  return agg._sum.unread ?? 0;
}

/** Leonardo responde pelo painel: a mensagem sai pelo número da Margot e ela pausa nesta conversa. */
export async function sendAsLeonardo(id: number, text: string) {
  const body = text.trim().slice(0, 4000);
  if (!body) throw new RuleError("mensagem_vazia", "Escreva a mensagem.", 400);
  if (!waCanSend()) throw new RuleError("whatsapp_desligado", "O WhatsApp ainda não está configurado (veja Regras).", 503);
  const contact = await prisma.waContact.findUnique({ where: { id } });
  if (!contact) throw new RuleError("conversa_nao_encontrada", "Conversa não encontrada.", 404);
  if (!windowOpen(contact)) {
    throw new RuleError(
      "janela_fechada",
      "Faz mais de 24h que a pessoa não escreve, e o WhatsApp não deixa a empresa mandar mensagem livre. Use \"Abrir no meu WhatsApp\".",
      409,
    );
  }
  const r = await sendText(contact, body, { author: "leonardo" });
  if (!r.ok) throw new RuleError("falha_envio", explainError(r.error), 502);
  if (!contact.isOwner) {
    const until = new Date(Date.now() + MANUAL_PAUSE_HOURS * 3_600_000);
    const keep = contact.pausedUntil && contact.pausedUntil > until ? contact.pausedUntil : until;
    // notifiedAt zerado: a próxima mensagem da pessoa é novidade e deve chegar no celular dele.
    await prisma.waContact.update({ where: { id }, data: { pausedUntil: keep, unread: 0, notifiedAt: null } });
  }
  return getConversation(id);
}

export async function setPaused(id: number, paused: boolean) {
  await prisma.waContact.update({ where: { id }, data: { pausedUntil: paused ? PAUSED_FOREVER : null } });
  return getConversation(id);
}

// ─── Conexão (Regras) ────────────────────────────────────────

export async function connectionStatus() {
  const missing = waMissing();
  const c = waConfig();
  const last = await prisma.setting.findUnique({ where: { key: "whatsappUltimoWebhook" } });
  const owner = await ownerPhone();
  let numero: Record<string, unknown> | null = null;
  let erro: string | null = null;
  let saude: PhoneExtras | null = null;
  if (waCanSend()) {
    try {
      numero = { ...(await phoneInfo()) };
    } catch (e) {
      erro = explainError(e);
    }
    // Só o cartão usa: se a Meta não devolver, o cartão segue como antes.
    if (numero) saude = await phoneExtras().catch(() => null);
  }
  const site = siteUrl();
  return {
    configurado: missing.length === 0,
    faltando: missing,
    numero,
    saude,
    erro,
    webhookUrl: site ? `${site}/api/whatsapp/webhook` : "/api/whatsapp/webhook",
    ultimoWebhook: last?.value ?? null,
    dono: owner ? formatPhone(owner) : null,
    voz: voiceReady(),
    modelo: c.ownerTemplate,
    temWaba: Boolean(c.wabaId),
  };
}

export async function connectionAction(action: string, input: Record<string, unknown>) {
  if (!waCanSend()) throw new RuleError("whatsapp_desligado", "Configure WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID na Vercel primeiro.", 400);
  try {
    if (action === "registrar") {
      const pin = String(input.pin ?? "").replace(/\D/g, "");
      if (pin.length !== 6) throw new RuleError("pin_invalido", "O PIN precisa ter 6 números.", 400);
      await registerNumber(pin);
      return { mensagem: "Número registrado na API do WhatsApp. Guarde esse PIN: é a confirmação em duas etapas do número." };
    }
    if (action === "assinar") {
      await subscribeApp();
      return { mensagem: "Pronto: o app passa a receber as mensagens desta conta do WhatsApp." };
    }
    if (action === "teste") {
      const owner = await ownerPhone();
      if (!owner) throw new RuleError("sem_dono", "Preencha \"Seu WhatsApp pessoal\" nas Regras e salve.", 400);
      const r = await notifyOwner({
        text: "Olá, Leonardo! Aqui é a Margot. A conexão com o WhatsApp está funcionando. ✅",
        summary: "teste de conexão da Margot",
      });
      const msg: Record<string, string> = {
        enviado: "Mensagem de teste enviada para o seu WhatsApp.",
        modelo: "Mandei o aviso modelo (a conversa estava fechada). Responda qualquer coisa no seu WhatsApp para receber o teste.",
        fila: "Não consegui mandar o aviso modelo. Mande um \"oi\" do seu WhatsApp para o número da Margot e o teste chega em seguida.",
        falhou: "O WhatsApp recusou a mensagem. Veja o erro na conversa \"Leonardo\" em Conversas.",
        desligado: "WhatsApp ou seu número ainda não configurados.",
      };
      return { mensagem: msg[r.result] };
    }
  } catch (e) {
    if (e instanceof RuleError) throw e;
    throw new RuleError("whatsapp_recusou", explainError(e), 502);
  }
  throw new RuleError("acao_invalida", "Ação desconhecida.", 400);
}
