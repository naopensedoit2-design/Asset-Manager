// Google Agenda via conta de serviço (sem tela de login e sem token que expira).
// O Leonardo compartilha a agenda com o e-mail da conta de serviço, com permissão de
// "Fazer alterações nos eventos". Variáveis: GOOGLE_SERVICE_ACCOUNT_JSON e GOOGLE_CALENDAR_ID.

import { createSign } from "node:crypto";
import { busyDays, type GoogleEvent } from "./busy-days";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

const API = process.env["GOOGLE_API_BASE"] || "https://www.googleapis.com/calendar/v3";
const TOKEN_URL = process.env["GOOGLE_TOKEN_URL"] || "https://oauth2.googleapis.com/token";

function readAccount(): ServiceAccount | null {
  const raw = process.env["GOOGLE_SERVICE_ACCOUNT_JSON"]?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    if (!parsed.client_email || !parsed.private_key) return null;
    return { client_email: parsed.client_email, private_key: String(parsed.private_key).replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

export function calendarId(): string | null {
  return process.env["GOOGLE_CALENDAR_ID"]?.trim() || null;
}

export function isConfigured(): boolean {
  return Boolean(readAccount() && calendarId());
}

export function serviceAccountEmail(): string | null {
  return readAccount()?.client_email ?? null;
}

let cachedToken: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const acc = readAccount();
  if (!acc) throw new Error("Conta de serviço do Google não configurada.");
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: acc.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(acc.private_key).toString("base64url");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(`Google recusou o acesso: ${json.error_description ?? res.status}`);
  cachedToken = { value: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return json.access_token;
}

async function gfetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Google Agenda ${res.status}: ${json?.error?.message ?? "erro"}`);
  return json;
}

// ─── Leitura: dias ocupados ──────────────────────────────────

let busyCache: { at: number; days: { date: string; summary: string }[] } | null = null;
let lastError: string | null = null;

/** Dias ocupados de hoje até 2 anos à frente. Cache de 2 minutos; se o Google falhar, devolve vazio. */
export async function googleBusyDays(): Promise<{ date: string; summary: string }[]> {
  if (!isConfigured()) return [];
  if (busyCache && Date.now() - busyCache.at < 120_000) return busyCache.days;
  try {
    const timeMin = new Date(Date.now() - 86_400_000).toISOString();
    const timeMax = new Date(Date.now() + 730 * 86_400_000).toISOString();
    const events: GoogleEvent[] = [];
    let pageToken: string | undefined;
    do {
      const q = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", maxResults: "2500", orderBy: "startTime" });
      if (pageToken) q.set("pageToken", pageToken);
      const page = await gfetch(`/calendars/${encodeURIComponent(calendarId()!)}/events?${q}`);
      events.push(...(page?.items ?? []));
      pageToken = page?.nextPageToken;
    } while (pageToken);
    const days = busyDays(events);
    busyCache = { at: Date.now(), days };
    lastError = null;
    return days;
  } catch (e) {
    lastError = (e as Error).message;
    console.error("[google] leitura da agenda", e);
    return busyCache?.days ?? [];
  }
}

export function clearBusyCache() {
  busyCache = null;
}

export async function calendarStatus() {
  if (!readAccount()) return { configurada: false, motivo: "Falta GOOGLE_SERVICE_ACCOUNT_JSON na Vercel." };
  if (!calendarId()) return { configurada: false, motivo: "Falta GOOGLE_CALENDAR_ID na Vercel." };
  clearBusyCache();
  const days = await googleBusyDays();
  return {
    configurada: true,
    ok: lastError === null,
    erro: lastError,
    contaDeServico: serviceAccountEmail(),
    diasOcupados: days.length,
    proximos: days.slice(0, 5),
  };
}

// ─── Escrita: eventos dos pedidos confirmados ────────────────

export interface CalendarEventInput {
  orderId: number;
  date: string; // AAAA-MM-DD
  time: string; // "HH:MM" ou ""
  durationHours: number;
  title: string;
  location: string;
  description: string;
}

function plusHours(date: string, time: string, hours: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  const dayOffset = Math.floor(total / 1440);
  const mins = total % 1440;
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return `${d.toISOString().slice(0, 10)}T${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}:00`;
}

export async function createOrderEvent(input: CalendarEventInput): Promise<string> {
  const timed = /^\d{2}:\d{2}$/.test(input.time);
  const body = {
    summary: input.title,
    location: input.location,
    description: input.description,
    start: timed ? { dateTime: `${input.date}T${input.time}:00`, timeZone: "America/Sao_Paulo" } : { date: input.date },
    end: timed
      ? { dateTime: plusHours(input.date, input.time, input.durationHours), timeZone: "America/Sao_Paulo" }
      : { date: plusHours(input.date, "00:00", 24).slice(0, 10) },
    extendedProperties: { private: { ecdlOrderId: String(input.orderId) } },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 24 * 60 }, { method: "popup", minutes: 180 }] },
  };
  const created = await gfetch(`/calendars/${encodeURIComponent(calendarId()!)}/events`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return created.id as string;
}

export async function deleteOrderEvent(eventId: string) {
  try {
    await gfetch(`/calendars/${encodeURIComponent(calendarId()!)}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
  } catch (e) {
    // 404/410: já foi apagado na agenda; segue em frente.
    if (!/ 40[4]|410/.test((e as Error).message)) throw e;
  }
}
