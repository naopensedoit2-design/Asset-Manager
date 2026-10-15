// O caminho de cada mensagem que chega:
// webhook → guarda (sem duplicar) → espera a pessoa terminar de digitar → uma resposta para tudo.
//
// Quem manda várias mensagens seguidas ("Oi" / "tudo bem?" / "queria o valor para 12/12") recebe
// uma resposta só: cada mensagem espera alguns segundos e só a execução da mais nova segue.
// Uma trava no contato impede duas respostas ao mesmo tempo.

import { prisma } from "@/lib/prisma";
import { downloadMedia, markRead } from "./client";
import { waConfig } from "./config";
import { respondToClient } from "./customer";
import { parseWebhook } from "./parse";
import { samePhone } from "./phone";
import { respondToOwner } from "./secretary";
import { applyStatus, claimContact, ownerPhone, releaseContact, saveInbound, type WaContact, type WaMessage } from "./store";
import { transcribe, voiceReady } from "./voice";

export interface Job {
  contactId: number;
  messageId: number;
  delayMs: number;
}

const CLIENT_DELAY_MS = Number(process.env["WHATSAPP_DEBOUNCE_MS"] ?? 5000);
const OWNER_DELAY_MS = Math.min(CLIENT_DELAY_MS, 2500);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Guarda tudo o que chegou e devolve, por contato, a mensagem mais nova que pede resposta. */
export async function ingest(payload: unknown): Promise<Job[]> {
  const parsed = parseWebhook(payload);
  const { phoneNumberId } = waConfig();
  const owner = await ownerPhone();
  // Eventos de outro número do mesmo app (ex.: o número de teste da Meta) são ignorados.
  const mine = (id: string) => !phoneNumberId || !id || id === phoneNumberId;

  for (const s of parsed.statuses) if (mine(s.phoneNumberId)) await applyStatus(s);

  const jobs = new Map<number, Job>();
  for (const m of parsed.messages) {
    if (!mine(m.phoneNumberId)) continue;
    const saved = await saveInbound(m, owner);
    if (!saved || saved.message.handledAt) continue;
    const isOwner = samePhone(saved.contact.waId, owner);
    // Toque em botão não precisa esperar: é uma resposta completa.
    const delayMs = m.buttonId ? 0 : isOwner ? OWNER_DELAY_MS : CLIENT_DELAY_MS;
    jobs.set(saved.contact.id, { contactId: saved.contact.id, messageId: saved.message.id, delayMs });
  }
  return [...jobs.values()];
}

/** Responde a um contato. Seguro para rodar em paralelo: só uma execução por contato responde. */
export async function processContact(job: Job): Promise<void> {
  if (job.delayMs > 0) await sleep(job.delayMs);
  // Chegou mensagem mais nova esperando resposta? A execução dela responde tudo junto.
  const newer = await prisma.waMessage.findFirst({
    where: { contactId: job.contactId, direction: "in", handledAt: null, id: { gt: job.messageId } },
    select: { id: true },
  });
  if (newer) return;
  if (!(await claimContact(job.contactId))) return; // outra execução está respondendo e vai pegar esta também

  try {
    for (let round = 0; round < 3; round++) {
      const contact = await prisma.waContact.findUnique({ where: { id: job.contactId } });
      const pending = await prisma.waMessage.findMany({
        where: { contactId: job.contactId, direction: "in", handledAt: null },
        orderBy: { id: "asc" },
        take: 20,
      });
      if (!contact || !pending.length) break;
      // Marca antes de responder: se algo falhar, a mesma mensagem não gera respostas repetidas.
      await prisma.waMessage.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { handledAt: new Date() } });
      try {
        await respond(contact, pending);
      } catch (e) {
        console.error(`[whatsapp] resposta ao contato ${contact.id}`, e);
      }
    }
  } finally {
    await releaseContact(job.contactId);
  }
}

async function respond(contact: WaContact, pending: WaMessage[]) {
  const last = pending[pending.length - 1];
  if (last.wamid) await markRead(last.wamid, true).catch(() => {}); // tiques azuis + "digitando…"

  for (const m of pending) {
    if (m.type !== "audio" || m.text || !m.mediaId || !voiceReady()) continue;
    try {
      const { data, mime } = await downloadMedia(m.mediaId);
      const text = await transcribe(data, mime || m.mediaMime);
      if (text) {
        m.text = text.slice(0, 4000);
        await prisma.waMessage.update({ where: { id: m.id }, data: { text: m.text } });
      }
    } catch (e) {
      console.error("[whatsapp] transcrição", e);
    }
  }

  const owner = await ownerPhone();
  if (owner && samePhone(contact.waId, owner)) await respondToOwner(contact, pending);
  else await respondToClient(contact, pending);
}
