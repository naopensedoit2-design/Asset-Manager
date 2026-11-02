// Casamentos que estão na Google Agenda do dono, prontos para o painel mostrar com nome. Puro, sem rede:
// testado em bookings.test.ts. Quem decide o que é "casamento" é busy-days.ts (kindOf).

import { bookingScore, type AgendaItem } from "./busy-days.ts";

export interface Booking {
  /** Primeiro dia (AAAA-MM-DD). */
  date: string;
  /** "HH:MM" ou "" quando o evento é de dia inteiro. */
  time: string;
  /** Nome a mostrar, sem o "Eu Casei de Lafer" do fim (só repete o nome do negócio). */
  title: string;
  /** Outros compromissos de casamento no mesmo dia (ex.: o casamento e a entrega da noiva). */
  also: string[];
  location: string;
  /** Link do evento no Google Agenda. */
  link: string;
}

const BUSINESS_SUFFIX = /\s*[-–—(]*\s*eu casei de lafer\s*\)?\s*$/i;

/** "Casamento Bia & Caio - Eu Casei de Lafer" vira "Casamento Bia & Caio". */
export function cleanTitle(title: string): string {
  const t = title.replace(BUSINESS_SUFFIX, "").replace(/\s+/g, " ").trim();
  return t || title.trim();
}

/** Casamentos de hoje em diante, um por dia (dois eventos no mesmo dia viram um só, com o outro em `also`). */
export function bookings(items: AgendaItem[], today: string): Booking[] {
  const byDate = new Map<string, AgendaItem[]>();
  for (const i of items) {
    if (i.kind !== "casamento" || !i.blocks || i.date < today) continue;
    byDate.set(i.date, [...(byDate.get(i.date) ?? []), i]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => {
      const ranked = [...list].sort((a, b) => bookingScore(b.title) - bookingScore(a.title));
      const main = ranked[0];
      const title = cleanTitle(main.title);
      const also = [...new Set(ranked.slice(1).map((i) => cleanTitle(i.title)))].filter((t) => t !== title);
      return {
        date,
        time: main.time,
        title,
        also,
        location: ranked.map((i) => i.location).find(Boolean) ?? "",
        link: main.link,
      };
    });
}
