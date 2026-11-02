// Pedido criado a partir de um casamento que já estava na Google Agenda do dono: o painel guarda de qual evento ele
// veio. Fica na tabela Setting (uma linha por pedido), sem mudar o schema. Puro, sem banco nem rede: testado em links.test.ts.

export const LINK_PREFIX = "googleVinculo:";

export interface GoogleLink {
  orderId: number;
  /** Id do evento na Google Agenda. */
  eventId: string;
  /** Dia do evento quando o vínculo foi criado (AAAA-MM-DD). */
  date: string;
}

export function linkKey(orderId: number): string {
  return `${LINK_PREFIX}${orderId}`;
}

export function encodeLink(eventId: string, date: string): string {
  return JSON.stringify({ eventId, date });
}

/** Lê uma linha de Setting. Devolve null se não for um vínculo válido (nunca lança). */
export function parseLink(key: string, value: string): GoogleLink | null {
  if (!key.startsWith(LINK_PREFIX)) return null;
  const orderId = Number(key.slice(LINK_PREFIX.length));
  if (!Number.isInteger(orderId) || orderId <= 0) return null;
  try {
    const v = JSON.parse(value) as { eventId?: unknown; date?: unknown };
    if (typeof v.eventId !== "string" || !v.eventId || typeof v.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return null;
    return { orderId, eventId: v.eventId, date: v.date };
  } catch {
    return null;
  }
}

export function linksFromRows(rows: { key: string; value: string }[]): GoogleLink[] {
  return rows.flatMap((r) => {
    const link = parseLink(r.key, r.value);
    return link ? [link] : [];
  });
}
