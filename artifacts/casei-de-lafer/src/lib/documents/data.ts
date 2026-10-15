import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/gestor/service";
import { dateToISO, type QuoteItem, type Settings } from "@/lib/gestor/rules";

export type DocKind = "casamento" | "ensaio";

export interface DocData {
  orderId: number;
  kind: DocKind;
  names: string;
  legalName: string;
  document: string;
  address: string;
  eventDate: string | null;
  eventTime: string;
  duration: string;
  venue: string;
  city: string;
  items: QuoteItem[];
  totalCents: number;
  depositCents: number;
  discountCents: number;
  issuedAt: Date;
  settings: Settings;
}

export function kindOf(items: { name: string }[]): DocKind {
  return items.some((i) => /ensaio|pr[ée]-?wedding/i.test(i.name)) ? "ensaio" : "casamento";
}

/** Gera (uma vez) o código do link privado da proposta e do termo deste pedido. */
export async function ensurePublicToken(orderId: number): Promise<string> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { publicToken: true } });
  if (!order) throw new Error("Pedido não encontrado");
  if (order.publicToken) return order.publicToken;
  const token = randomBytes(15).toString("base64url");
  await prisma.order.update({ where: { id: orderId }, data: { publicToken: token } });
  return token;
}

export async function loadDocData(token: string): Promise<DocData | null> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null;
  const order = await prisma.order.findUnique({
    where: { publicToken: token },
    include: { client: true, quotes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const quote = order?.quotes[0];
  if (!order || !quote) return null;
  const items = (quote.items as unknown as QuoteItem[]) ?? [];
  return {
    orderId: order.id,
    kind: kindOf(items),
    names: order.client.name,
    legalName: order.client.legalName,
    document: order.client.document,
    address: order.client.address,
    eventDate: dateToISO(order.eventDate),
    eventTime: order.eventTime,
    duration: order.duration,
    venue: order.venue,
    city: order.city,
    items,
    totalCents: quote.totalCents,
    depositCents: quote.depositCents,
    discountCents: quote.discountCents,
    issuedAt: quote.sentAt ?? quote.createdAt,
    settings: await getSettings(),
  };
}

// ─── Formatação ──────────────────────────────────────────────

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function dateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")} de ${MONTHS[m - 1]} de ${y}`;
}

export function instantLong(d: Date): string {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return dateLong(iso);
}

export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const money = (cents: number) => brl.format(cents / 100).replace(/ /g, " ");

export function placeLabel(d: Pick<DocData, "venue" | "city">): string {
  return [d.venue, d.city].filter(Boolean).join(" — ") || "A definir";
}

export function durationLabel(d: Pick<DocData, "duration">): string {
  return d.duration.trim() || "Até 3 horas no local";
}
