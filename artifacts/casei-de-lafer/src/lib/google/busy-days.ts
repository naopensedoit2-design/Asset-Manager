// Converte eventos da Google Agenda em dias ocupados (AAAA-MM-DD, fuso de São Paulo) e na lista de
// compromissos que o painel mostra. Puro, sem rede: testado em busy-days.test.ts.

export interface GoogleEvent {
  id: string;
  status?: string; // "cancelled" para eventos apagados
  recurringEventId?: string; // presente nas ocorrências de eventos que se repetem
  transparency?: string; // "transparent" = marcado como "Disponível"
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
}

/** casamento = parece serviço do negócio; lembrete = aviso sobre um compromisso (não é o compromisso); outro = o resto. */
export type AgendaKind = "casamento" | "lembrete" | "outro";
export type IgnoredBecause = "lembrete" | "disponivel" | "muito_longo";

export interface AgendaItem {
  id: string;
  title: string;
  /** Primeiro dia (AAAA-MM-DD, fuso de São Paulo). */
  date: string;
  /** Último dia, inclusive. Igual a `date` na maioria dos eventos. */
  endDate: string;
  /** "HH:MM" no fuso de São Paulo, ou "" quando o evento é de dia inteiro. */
  time: string;
  allDay: boolean;
  location: string;
  link: string;
  kind: AgendaKind;
  /** Trava os dias do evento para a Margot, o painel e os pedidos? */
  blocks: boolean;
  /** Quando não trava, o motivo (o painel explica). */
  ignoredBecause?: IgnoredBecause;
}

export interface BusyDay {
  date: string;
  /** Nome do compromisso que trava o dia (o casamento tem prioridade sobre os outros). */
  summary: string;
  kind: AgendaKind;
  eventId: string;
}

export interface AgendaCounts {
  /** Eventos lidos do Google. */
  eventos: number;
  /** Compromissos únicos (os que o painel considera). */
  unicos: number;
  repetidos: number;
  cancelados: number;
  /** Criados pelo próprio site: já têm reserva no banco. */
  doSite: number;
}

export interface AgendaRead {
  items: AgendaItem[];
  days: BusyDay[];
  counts: AgendaCounts;
}

const TZ = "America/Sao_Paulo";

/** Evento de dia inteiro com mais de 30 dias (ex.: "Férias 2027", "Temporada") não fecha a agenda inteira. */
const MAX_ALL_DAY_SPAN = 30;

function localDay(dateTime: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(dateTime),
  );
}

function localTime(dateTime: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(dateTime),
  );
}

function shiftDay(d: string, delta: number): string {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + delta);
  return x.toISOString().slice(0, 10);
}

function spanDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

export function plain(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Palavras que marcam um compromisso do negócio. "casamento" só no singular: "casamentos.com.br" é um site, não um casamento.
const BOOKING = /\b(casamento|noiva|noivo|noivos|ensaio|pre[- ]?wedding|wedding|eu casei|lafer)\b/;
// Avisos que a rotina cria antes do casamento ("Lembrete 10 dias: ...", "Preparação e Confirmação: ..."): não são o casamento.
const REMINDER = /^(lembrete|lembrar|preparacao e confirmacao)\b/;

export function kindOf(title: string): AgendaKind {
  const t = plain(title).trim();
  if (REMINDER.test(t)) return "lembrete";
  return BOOKING.test(t) ? "casamento" : "outro";
}

/** Qual título descreve melhor o serviço do dia: o que cita o negócio, depois a entrega da noiva, depois "casamento". */
export function bookingScore(title: string): number {
  const t = plain(title);
  return (/lafer/.test(t) ? 4 : 0) + (/\b(entrega|noiva|noivo|noivos)\b/.test(t) ? 2 : 0) + (/\bcasamento\b/.test(t) ? 1 : 0);
}

function toItem(e: GoogleEvent): AgendaItem | null {
  const title = e.summary?.trim() || "Compromisso";
  const kind = kindOf(title);
  let date: string;
  let endDate: string;
  let time = "";
  let allDay = false;
  if (e.start?.date) {
    allDay = true;
    date = e.start.date;
    const endExclusive = e.end?.date ?? shiftDay(date, 1); // fim é exclusivo no Google
    endDate = endExclusive > date ? shiftDay(endExclusive, -1) : date;
  } else if (e.start?.dateTime) {
    date = localDay(e.start.dateTime);
    time = localTime(e.start.dateTime);
    endDate = e.end?.dateTime ? localDay(new Date(new Date(e.end.dateTime).getTime() - 1).toISOString()) : date;
    if (endDate < date) endDate = date;
  } else {
    return null;
  }

  let ignoredBecause: IgnoredBecause | undefined;
  if (kind === "lembrete") ignoredBecause = "lembrete";
  else if (allDay && spanDays(date, endDate) > MAX_ALL_DAY_SPAN) ignoredBecause = "muito_longo";
  // "Disponível" tira o dia do bloqueio, menos para casamento: evento de dia inteiro nasce "Disponível" no Google,
  // e um casamento anotado assim não pode ficar de fora (a data seria oferecida a outro cliente).
  else if (e.transparency === "transparent" && kind !== "casamento") ignoredBecause = "disponivel";

  return {
    id: e.id,
    title,
    date,
    endDate,
    time,
    allDay,
    location: e.location?.trim() ?? "",
    link: e.htmlLink ?? "",
    kind,
    blocks: !ignoredBecause,
    ...(ignoredBecause ? { ignoredBecause } : {}),
  };
}

/**
 * Regras: evento cancelado, que se repete (rotina, trabalho, aniversário) ou criado pelo próprio site (que já tem
 * reserva no banco) não entra. Dos compromissos únicos, trava o dia o que está "Ocupado" no Google, e todo casamento,
 * mesmo marcado "Disponível". Lembrete de casamento não trava. Evento de dia inteiro trava todos os dias que cobre;
 * evento com horário trava o dia em que acontece.
 */
export function readAgenda(events: GoogleEvent[]): AgendaRead {
  const counts: AgendaCounts = { eventos: events.length, unicos: 0, repetidos: 0, cancelados: 0, doSite: 0 };
  const items: AgendaItem[] = [];
  for (const e of events) {
    if (e.status === "cancelled") {
      counts.cancelados++;
      continue;
    }
    if (e.recurringEventId) {
      counts.repetidos++;
      continue;
    }
    if (e.extendedProperties?.private?.["ecdlOrderId"]) {
      counts.doSite++;
      continue;
    }
    const item = toItem(e);
    if (!item) continue;
    counts.unicos++;
    items.push(item);
  }

  // Casamento primeiro (e, entre casamentos, o título que melhor descreve o serviço): se há dois compromissos no mesmo
  // dia, o nome que aparece é o do casamento.
  const rank = (i: AgendaItem) => (i.kind === "casamento" ? 1 + bookingScore(i.title) : 0);
  const blocking = items.filter((i) => i.blocks).sort((a, b) => rank(b) - rank(a));
  const out = new Map<string, BusyDay>();
  for (const i of blocking) {
    for (let d = i.date; d <= i.endDate; d = shiftDay(d, 1)) {
      if (!out.has(d)) out.set(d, { date: d, summary: i.title, kind: i.kind, eventId: i.id });
    }
  }
  const days = [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
  items.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return { items, days, counts };
}

/** Dias que travam, na forma antiga (`{ date, summary }`). */
export function busyDays(events: GoogleEvent[]): BusyDay[] {
  return readAgenda(events).days;
}
