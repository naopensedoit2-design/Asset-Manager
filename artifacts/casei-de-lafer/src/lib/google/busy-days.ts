// Converte eventos da Google Agenda em dias ocupados (AAAA-MM-DD, fuso de São Paulo).
// Puro, sem rede: testado em busy-days.test.ts.

export interface GoogleEvent {
  id: string;
  status?: string; // "cancelled" para eventos apagados
  transparency?: string; // "transparent" = marcado como "Disponível"
  summary?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
}

const TZ = "America/Sao_Paulo";

function localDay(dateTime: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(dateTime),
  );
}

function nextDay(d: string): string {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
}

/**
 * Regras: evento cancelado ou marcado como "Disponível" não bloqueia; eventos criados pelo
 * próprio site (que já têm reserva no banco) são ignorados para não contar duas vezes.
 * Evento de dia inteiro bloqueia todos os dias que cobre; evento com horário bloqueia o dia em que acontece.
 */
export function busyDays(events: GoogleEvent[]): { date: string; summary: string }[] {
  const out = new Map<string, string>();
  for (const e of events) {
    if (e.status === "cancelled" || e.transparency === "transparent") continue;
    if (e.extendedProperties?.private?.["ecdlOrderId"]) continue;
    const title = e.summary?.trim() || "Compromisso";
    if (e.start?.date) {
      const end = e.end?.date ?? nextDay(e.start.date); // fim é exclusivo no Google
      for (let d = e.start.date; d < end; d = nextDay(d)) if (!out.has(d)) out.set(d, title);
    } else if (e.start?.dateTime) {
      const first = localDay(e.start.dateTime);
      const last = e.end?.dateTime ? localDay(new Date(new Date(e.end.dateTime).getTime() - 1).toISOString()) : first;
      for (let d = first; d <= last; d = nextDay(d)) if (!out.has(d)) out.set(d, title);
    }
  }
  return [...out.entries()].map(([date, summary]) => ({ date, summary })).sort((a, b) => a.date.localeCompare(b.date));
}
