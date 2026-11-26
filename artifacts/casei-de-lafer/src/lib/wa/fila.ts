// Avisos que esperaram a janela de 24h abrir chegam ao Leonardo com a hora em que aconteceram.
// Sem isso, um erro de ontem chega como se fosse de agora e ele não sabe se ainda está valendo.
//
// Regra pura (sem banco), com testes em fila.test.ts.

import type { OutMessage } from "./client";

/** Aviso guardado há menos que isso sai como está. */
export const ATRASO_MINIMO_MS = 30 * 60_000;

const LIMITE_TEXTO = 4096;
const LIMITE_BOTOES = 1024;

/** "25/11 às 14:32" no fuso de São Paulo. */
export function horaDoAviso(quando: Date, fuso = "America/Sao_Paulo"): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: fuso,
  }).formatToParts(quando);
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "";
  return `${p("day")}/${p("month")} às ${p("hour")}:${p("minute")}`;
}

/**
 * Põe "🕓 Aviso de dd/mm às hh:mm" no começo de um aviso atrasado.
 * Só mexe em texto e em mensagem com botões; o resto (mídia, modelo) sai igual.
 * Se o texto passaria do limite do WhatsApp, também sai igual.
 */
export function comHoraDoAviso(message: OutMessage, criadoEm: Date, agora: Date): OutMessage {
  if (agora.getTime() - criadoEm.getTime() < ATRASO_MINIMO_MS) return message;
  const linha = `🕓 Aviso de ${horaDoAviso(criadoEm)}\n`;

  if (message.type === "text") {
    const text = message["text"] as { body?: unknown } | undefined;
    if (!text || typeof text.body !== "string") return message;
    const body = linha + text.body;
    if (body.length > LIMITE_TEXTO) return message;
    return { ...message, text: { ...text, body } };
  }

  if (message.type === "interactive") {
    const inter = message["interactive"] as { body?: { text?: unknown } } | undefined;
    if (!inter?.body || typeof inter.body.text !== "string") return message;
    const corpo = linha + inter.body.text;
    if (corpo.length > LIMITE_BOTOES) return message;
    return { ...message, interactive: { ...inter, body: { ...inter.body, text: corpo } } };
  }

  return message;
}
