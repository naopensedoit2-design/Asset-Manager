// Avisos para o Leonardo no WhatsApp pessoal dele.
//
// O WhatsApp só deixa a empresa mandar mensagem livre até 24h depois da última mensagem da
// pessoa. Fora disso, só um modelo aprovado pela Meta ("aviso_margot", com uma linha de resumo).
// Então: com a janela aberta, o aviso vai completo (com botões); fechada, vai o modelo e o aviso
// completo fica na fila, entregue assim que o Leonardo responder qualquer coisa.

import { prisma } from "@/lib/prisma";
import { explainError, send, templateMessage, textMessage, WaApiError, type OutMessage } from "./client";
import { waCanSend, waConfig } from "./config";
import { oneLine } from "./format";
import { ownerContact, saveOutbound, updateOutbound, windowOpen, type WaContact, type WaMessage } from "./store";

export interface OwnerNotice {
  /** Texto completo (corpo da mensagem). */
  text: string;
  /** Uma linha para o modelo, usada quando a janela de 24h está fechada. */
  summary: string;
  /** Monta a mensagem final; recebe o id da mensagem guardada (para botões de confirmação). */
  build?: (rowId: number) => OutMessage;
  kind?: string; // aviso | confirmacao | resumo_diario
  action?: string; // ação que espera o "sim" do Leonardo (JSON)
  mediaId?: string;
  mediaMime?: string;
}

export type NoticeResult = "enviado" | "modelo" | "fila" | "falhou" | "desligado";

/** Não manda outro modelo se já mandou um há pouco e o Leonardo ainda não respondeu. */
const TEMPLATE_COOLDOWN_MS = 30 * 60_000;

export async function notifyOwner(n: OwnerNotice): Promise<{ result: NoticeResult; row: WaMessage | null }> {
  if (!waCanSend()) return { result: "desligado", row: null };
  const owner = await ownerContact();
  if (!owner) return { result: "desligado", row: null };

  if (n.kind === "resumo_diario") {
    // Só o resumo mais recente interessa.
    await prisma.waMessage.deleteMany({ where: { contactId: owner.id, status: "pendente", kind: "resumo_diario" } });
  }
  const row = await saveOutbound({
    contactId: owner.id,
    author: "margot",
    type: "text",
    text: n.text,
    status: "pendente",
    kind: n.kind ?? "aviso",
    action: n.action ?? "",
    mediaId: n.mediaId,
    mediaMime: n.mediaMime,
  });
  const message = n.build ? n.build(row.id) : textMessage(n.text);
  await updateOutbound(row.id, { status: "pendente", payload: JSON.stringify(message) });
  await prisma.waMessage.update({ where: { id: row.id }, data: { type: message.type } });

  if (windowOpen(owner)) {
    const sent = await trySend(owner, row.id, message, n.text);
    if (sent !== "janela") {
      return {
        result: sent === "enviada" ? "enviado" : "falhou",
        row: await prisma.waMessage.findUniqueOrThrow({ where: { id: row.id } }),
      };
    }
  }
  return { result: await sendTemplate(owner, n.summary), row };
}

/**
 * Tenta enviar. Janela fechada: a mensagem continua na fila ("janela").
 * Outro erro: tenta mandar só o texto; se nem isso der, marca como falha.
 */
async function trySend(owner: WaContact, rowId: number, message: OutMessage, fallbackText: string): Promise<"enviada" | "janela" | "falhou"> {
  try {
    const wamid = await send(owner.waId, message);
    await updateOutbound(rowId, { status: "enviada", wamid });
    return "enviada";
  } catch (e) {
    if (e instanceof WaApiError && e.windowClosed) return "janela";
    console.error("[whatsapp] aviso ao Leonardo", e);
    if (message.type !== "text") {
      try {
        const wamid = await send(owner.waId, textMessage(fallbackText));
        await updateOutbound(rowId, { status: "enviada", wamid, error: explainError(e) });
        return "enviada";
      } catch (e2) {
        if (e2 instanceof WaApiError && e2.windowClosed) return "janela";
      }
    }
    await updateOutbound(rowId, { status: "falhou", error: explainError(e) });
    return "falhou";
  }
}

async function sendTemplate(owner: WaContact, summary: string): Promise<NoticeResult> {
  const recent = await prisma.waMessage.findFirst({
    where: {
      contactId: owner.id,
      type: "template",
      status: { in: ["enviada", "entregue", "lida"] },
      createdAt: { gte: new Date(Date.now() - TEMPLATE_COOLDOWN_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent && (!owner.lastInboundAt || owner.lastInboundAt < recent.createdAt)) return "fila";

  const c = waConfig();
  const param = oneLine(summary, 700) || "Novidade no atendimento";
  try {
    const wamid = await send(owner.waId, templateMessage(c.ownerTemplate, c.templateLang, [param]));
    await saveOutbound({ contactId: owner.id, author: "sistema", type: "template", text: param, wamid, status: "enviada", kind: "aviso" });
    return "modelo";
  } catch (e) {
    console.error("[whatsapp] modelo para o Leonardo", e);
    await saveOutbound({
      contactId: owner.id,
      author: "sistema",
      type: "template",
      text: param,
      status: "falhou",
      error: explainError(e),
      kind: "aviso",
    });
    return "fila";
  }
}

/** Entrega os avisos que esperavam a janela abrir. Devolve quantos foram enviados. */
export async function flushOwnerQueue(owner: WaContact): Promise<number> {
  const queued = await prisma.waMessage.findMany({
    where: {
      contactId: owner.id,
      direction: "out",
      status: "pendente",
      createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
    },
    orderBy: { id: "asc" },
    take: 10,
  });
  let sent = 0;
  for (const row of queued) {
    let message: OutMessage;
    try {
      message = JSON.parse(row.payload || "null") ?? textMessage(row.text);
    } catch {
      message = textMessage(row.text);
    }
    const r = await trySend(owner, row.id, message, row.text);
    if (r === "janela") break;
    if (r === "enviada") sent++;
  }
  return sent;
}
