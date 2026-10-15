// Banco das conversas do WhatsApp: contatos, mensagens, status de entrega e janela de 24h.

import type { WaContact, WaMessage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/gestor/service";
import { canonicalPhone, formatPhone, phoneVariants, samePhone } from "./phone";
import type { InboundMessage, StatusUpdate } from "./parse";

export type { WaContact, WaMessage };

const WINDOW_MS = 24 * 3_600_000;
/** Margem de segurança: perto do fim da janela, trata como fechada. */
const WINDOW_MARGIN_MS = 10 * 60_000;
/** "Pausada" sem prazo: o Leonardo retoma quando quiser. */
export const PAUSED_FOREVER = new Date("2100-01-01T00:00:00Z");

export function windowOpen(contact: Pick<WaContact, "lastInboundAt">, now = new Date()): boolean {
  if (!contact.lastInboundAt) return false;
  return now.getTime() - contact.lastInboundAt.getTime() < WINDOW_MS - WINDOW_MARGIN_MS;
}

export function isPaused(contact: Pick<WaContact, "pausedUntil">, now = new Date()): boolean {
  return Boolean(contact.pausedUntil && contact.pausedUntil > now);
}

/** Número do Leonardo (Regras → "Seu WhatsApp pessoal"). */
export async function ownerPhone(): Promise<string> {
  const settings = await getSettings();
  return settings.ownerPhone ? canonicalPhone(settings.ownerPhone) : "";
}

/** Acha o cliente do painel pelo número (com ou sem o nono dígito) e o pedido em aberto mais recente. */
async function linkClient(waId: string) {
  const client = await prisma.client.findFirst({ where: { phone: { in: phoneVariants(waId) } } });
  if (!client) return { clientId: null, orderId: null };
  const order = await prisma.order.findFirst({
    where: { clientId: client.id, status: { notIn: ["realizado", "perdido", "cancelado"] } },
    orderBy: { createdAt: "desc" },
  });
  return { clientId: client.id, orderId: order?.id ?? null };
}

/** Guarda a mensagem recebida. Devolve null se ela já tinha chegado (a Meta reenvia em caso de demora). */
export async function saveInbound(m: InboundMessage, owner: string): Promise<{ contact: WaContact; message: WaMessage } | null> {
  const exists = await prisma.waMessage.findUnique({ where: { wamid: m.wamid }, select: { id: true } });
  if (exists) return null;

  const at = m.timestamp ? new Date(m.timestamp) : new Date();
  const isOwner = samePhone(m.from, owner);
  // O mesmo número pode estar guardado com ou sem o nono dígito (ex.: o contato do Leonardo é criado
  // a partir das Regras antes de ele escrever). Fica valendo a forma que o WhatsApp usa.
  let contact = await prisma.waContact.findFirst({ where: { waId: { in: phoneVariants(m.from) } }, orderBy: { id: "asc" } });
  if (contact && contact.waId !== m.from) {
    contact = await prisma.waContact.update({ where: { id: contact.id }, data: { waId: m.from } });
  }
  if (!contact) {
    const link = isOwner ? { clientId: null, orderId: null } : await linkClient(m.from);
    contact = await prisma.waContact
      .create({ data: { waId: m.from, name: m.profileName, isOwner, ...link } })
      .catch(async (e) => {
        // Duas mensagens do mesmo número chegando juntas: a outra criou o contato.
        if (e?.code === "P2002") return prisma.waContact.findUniqueOrThrow({ where: { waId: m.from } });
        throw e;
      });
  }

  const counted = m.type !== "reaction";
  contact = await prisma.waContact.update({
    where: { id: contact.id },
    data: {
      ...(m.profileName && m.profileName !== contact.name ? { name: m.profileName } : {}),
      isOwner,
      lastInboundAt: at > (contact.lastInboundAt ?? new Date(0)) ? at : contact.lastInboundAt,
      lastMessageAt: new Date(),
      ...(counted && !isOwner ? { unread: { increment: 1 } } : {}),
    },
  });

  try {
    const message = await prisma.waMessage.create({
      data: {
        contactId: contact.id,
        wamid: m.wamid,
        direction: "in",
        author: isOwner ? "leonardo" : "cliente",
        type: m.type,
        text: m.text.slice(0, 4000),
        mediaId: m.mediaId,
        mediaMime: m.mediaMime,
        fileName: m.fileName.slice(0, 200),
        status: "recebida",
        // Reações e mensagens de sistema não pedem resposta.
        handledAt: ["reaction", "system", "unsupported", "request_welcome", "ephemeral"].includes(m.type) ? new Date() : null,
        action: m.buttonId ? JSON.stringify({ button: m.buttonId.slice(0, 256) }) : "",
        createdAt: at,
      },
    });
    return { contact, message };
  } catch (e: any) {
    if (e?.code === "P2002") return null; // chegou duas vezes ao mesmo tempo
    throw e;
  }
}

const STATUS_PT: Record<string, string> = { sent: "enviada", delivered: "entregue", read: "lida", failed: "falhou" };
const STATUS_RANK: Record<string, number> = { pendente: 0, enviada: 1, entregue: 2, lida: 3, falhou: 4 };

/** Atualiza "entregue"/"lida"/"falhou" das mensagens enviadas, sem nunca voltar um passo. */
export async function applyStatus(s: StatusUpdate): Promise<void> {
  const next = STATUS_PT[s.status];
  if (!next) return;
  const msg = await prisma.waMessage.findUnique({ where: { wamid: s.wamid }, select: { id: true, status: true } });
  if (!msg) return;
  if ((STATUS_RANK[next] ?? 0) <= (STATUS_RANK[msg.status] ?? 0) && next !== "falhou") return;
  await prisma.waMessage.update({
    where: { id: msg.id },
    data: {
      status: next,
      ...(next === "falhou" ? { error: `${s.errorCode ?? ""} ${s.errorTitle}`.trim().slice(0, 300) } : {}),
    },
  });
}

export interface OutboundRecord {
  contactId: number;
  author: "margot" | "leonardo" | "sistema";
  type: string;
  text: string;
  wamid?: string;
  status: "enviada" | "falhou" | "pendente" | "rascunho";
  error?: string;
  kind?: string;
  payload?: string;
  action?: string;
  mediaId?: string;
  mediaMime?: string;
  fileName?: string;
}

export async function saveOutbound(r: OutboundRecord): Promise<WaMessage> {
  const message = await prisma.waMessage.create({
    data: {
      contactId: r.contactId,
      wamid: r.wamid || null,
      direction: "out",
      author: r.author,
      type: r.type,
      text: r.text.slice(0, 8000),
      status: r.status,
      error: (r.error ?? "").slice(0, 300),
      kind: r.kind ?? "",
      payload: r.payload ?? "",
      action: r.action ?? "",
      mediaId: r.mediaId ?? "",
      mediaMime: r.mediaMime ?? "",
      fileName: r.fileName ?? "",
    },
  });
  if (r.status === "enviada") {
    await prisma.waContact.update({ where: { id: r.contactId }, data: { lastMessageAt: new Date() } });
  }
  return message;
}

export async function updateOutbound(
  id: number,
  data: { status: OutboundRecord["status"]; wamid?: string; error?: string; payload?: string; text?: string },
): Promise<WaMessage> {
  const message = await prisma.waMessage.update({
    where: { id },
    data: {
      status: data.status,
      ...(data.wamid ? { wamid: data.wamid } : {}),
      ...(data.error !== undefined ? { error: data.error.slice(0, 300) } : {}),
      ...(data.payload !== undefined ? { payload: data.payload } : {}),
      ...(data.text !== undefined ? { text: data.text.slice(0, 8000) } : {}),
      ...(data.status === "enviada" ? { createdAt: new Date() } : {}),
    },
  });
  if (data.status === "enviada") {
    await prisma.waContact.update({ where: { id: message.contactId }, data: { lastMessageAt: new Date() } });
  }
  return message;
}

/** Contato do Leonardo (cria se ainda não existir, para poder avisá-lo). */
export async function ownerContact(): Promise<WaContact | null> {
  const phone = await ownerPhone();
  if (!phone) return null;
  const existing = await prisma.waContact.findFirst({ where: { waId: { in: phoneVariants(phone) } } });
  if (existing) {
    if (!existing.isOwner) return prisma.waContact.update({ where: { id: existing.id }, data: { isOwner: true } });
    return existing;
  }
  return prisma.waContact.create({ data: { waId: phone, name: "Leonardo", isOwner: true } });
}

/** Nome para mostrar ao Leonardo: o do cadastro do cliente, se houver; senão, o do perfil do WhatsApp. */
export async function contactLabel(contact: Pick<WaContact, "clientId" | "name" | "waId">): Promise<string> {
  if (contact.clientId) {
    const client = await prisma.client.findUnique({ where: { id: contact.clientId }, select: { name: true } });
    if (client?.name) return client.name;
  }
  return contact.name || formatPhone(contact.waId);
}

/** Contato do WhatsApp de um cliente do painel (pelo número, com ou sem o nono dígito). */
export async function contactForClientPhone(phone: string): Promise<WaContact | null> {
  return prisma.waContact.findFirst({ where: { waId: { in: phoneVariants(phone) }, isOwner: false } });
}

/** Trava o contato enquanto a Margot responde (outra execução para e deixa esta terminar). */
export async function claimContact(contactId: number, seconds = 55): Promise<boolean> {
  const now = new Date();
  const r = await prisma.waContact.updateMany({
    where: { id: contactId, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    data: { lockedUntil: new Date(now.getTime() + seconds * 1000) },
  });
  return r.count === 1;
}

export async function releaseContact(contactId: number): Promise<void> {
  await prisma.waContact.update({ where: { id: contactId }, data: { lockedUntil: null } }).catch(() => {});
}
