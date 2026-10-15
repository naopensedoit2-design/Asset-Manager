// Envia mensagens e guarda o que foi enviado (ou o erro) na conversa.

import { audioMessage, explainError, send, textMessage, uploadMedia, WaApiError, type OutMessage } from "./client";
import { splitText } from "./format";
import { saveOutbound, type OutboundRecord, type WaContact, type WaMessage } from "./store";
import { synthesize, speakable } from "./voice";

export interface SendResult {
  ok: boolean;
  message: WaMessage;
  error?: WaApiError | Error;
}

type Meta = Omit<OutboundRecord, "contactId" | "status" | "wamid" | "error" | "type"> & { type?: string };

/** Envia uma mensagem já montada e registra na conversa. Não lança erro: devolve ok=false. */
export async function sendAndStore(contact: Pick<WaContact, "id" | "waId">, message: OutMessage, meta: Meta): Promise<SendResult> {
  try {
    const wamid = await send(contact.waId, message);
    const saved = await saveOutbound({ ...meta, type: meta.type ?? message.type, contactId: contact.id, wamid, status: "enviada" });
    return { ok: true, message: saved };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    if (!(e instanceof WaApiError) || !e.windowClosed) console.error(`[whatsapp] envio para contato ${contact.id}`, e);
    const saved = await saveOutbound({
      ...meta,
      type: meta.type ?? message.type,
      contactId: contact.id,
      status: "falhou",
      error: explainError(e),
      payload: JSON.stringify(message),
    });
    return { ok: false, message: saved, error };
  }
}

/** Texto (dividido em partes se for longo). Devolve o resultado da última parte. */
export async function sendText(
  contact: Pick<WaContact, "id" | "waId">,
  text: string,
  meta: Omit<Meta, "text">,
): Promise<SendResult> {
  let last: SendResult | null = null;
  for (const part of splitText(text)) {
    last = await sendAndStore(contact, textMessage(part), { ...meta, text: part, type: "text" });
    if (!last.ok) break;
  }
  return last!;
}

/** Lê um texto em voz alta e manda como nota de voz. */
export async function sendVoice(contact: Pick<WaContact, "id" | "waId">, text: string, author: "margot" | "sistema" = "margot") {
  const audio = await synthesize(speakable(text));
  const mediaId = await uploadMedia(audio, "audio/ogg", "margot.ogg");
  return sendAndStore(contact, audioMessage(mediaId, true), {
    author,
    type: "audio",
    text: speakable(text),
    mediaId,
    mediaMime: "audio/ogg",
  });
}
