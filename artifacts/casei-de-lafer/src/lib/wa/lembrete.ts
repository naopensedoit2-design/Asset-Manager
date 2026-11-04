// Lembrete automático para lead que parou de responder. Puro, sem banco: decide quem recebe e o texto.
// Só uma vez por conversa parada, dentro da janela de 24 h do WhatsApp e em horário comercial.

export interface ConversaParada {
  isOwner: boolean;
  ignored: boolean;
  paused: boolean;
  blocked: boolean;
  /** Última mensagem da pessoa. */
  lastInboundAt: Date | null;
  /** Última mensagem da conversa (qualquer lado). */
  last: { direction: string; author: string; kind: string; createdAt: Date } | null;
  /** Já houve lembrete depois da última mensagem da pessoa. */
  lembradoDepois: boolean;
  /** Pedido da conversa já fechado (reservado, confirmado, realizado) ou encerrado (perdido, cancelado). */
  pedidoFechado: boolean;
  /** A conversa fala de casamento, ensaio, data ou valor (ou já tem pedido). */
  pareceLead: boolean;
}

const HORA = 3_600_000;

/** Hora local (0 a 23) no fuso do Brasil. */
export function horaLocal(now: Date, timeZone = "America/Sao_Paulo"): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone }).format(now));
}

/**
 * Manda o lembrete quando: a Margot respondeu por último (não é resposta automática do sistema), a pessoa está quieta
 * há pelo menos 4 h, ainda faltam 30 min para fechar a janela de 24 h, é entre 9h e 21h, e ainda não houve lembrete.
 */
export function precisaLembrete(c: ConversaParada, now: Date): boolean {
  if (c.isOwner || c.ignored || c.paused || c.blocked || c.pedidoFechado || !c.pareceLead) return false;
  if (!c.lastInboundAt || !c.last || c.lembradoDepois) return false;
  if (c.last.direction !== "out" || c.last.author !== "margot" || c.last.kind === "lembrete") return false;
  const quieta = now.getTime() - c.lastInboundAt.getTime();
  if (quieta < 4 * HORA || quieta > 23.5 * HORA) return false;
  const h = horaLocal(now);
  return h >= 9 && h < 21;
}

export function textoLembrete(nome: string): string {
  const first = nome.trim().split(/\s|&/)[0];
  return `Oi${first ? `, ${first}` : ""}! Passando para saber se ficou alguma dúvida sobre o MP Lafer. Se quiser, confiro outra data ou te mando a proposta por aqui. 😊`;
}
