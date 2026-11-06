import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { linha, leituraPermitida } from "@/lib/wa/leitura";

export const dynamic = "force-dynamic";

/**
 * Conversa do dono com a Margot (modo secretária), para o Claude analisar e melhorar a Margot.
 * Só pelo endereço único do deploy (VERCEL_URL, atrás da Vercel Authentication) e com LEITURA_SECRETARIA=1. Somente leitura.
 * ?dias=1..31 (padrão 2); ?lista=1 lista as conversas do período; ?contato=ID lê a conversa de um cliente.
 */
export async function GET(req: NextRequest) {
  // Os dois cabeçalhos de endereço, quando existem, têm de ser o endereço único deste deploy.
  const hosts = [req.headers.get("host"), req.headers.get("x-forwarded-host")].filter((h): h is string => !!h);
  if (!hosts.length || !hosts.every((h) => leituraPermitida(h, process.env.LEITURA_SECRETARIA, process.env.VERCEL_URL))) {
    return NextResponse.json({ ok: false, error: "não encontrado" }, { status: 404 });
  }
  const q = req.nextUrl.searchParams;
  const dias = Math.min(Math.max(Number(q.get("dias")) || 2, 1), 31);
  const since = new Date(Date.now() - dias * 86_400_000);
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex" };

  // ?lista=1: conversas com movimento no período (para achar a de um cliente). ?contato=ID: a conversa desse contato.
  if (q.get("lista") === "1") {
    const contacts = await prisma.waContact.findMany({
      where: { lastMessageAt: { gte: since } },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      select: { id: true, name: true, isOwner: true, ignoredAt: true, ignoredReason: true, pausedUntil: true, orderId: true, lastMessageAt: true },
    });
    return NextResponse.json({ ok: true, data: { conversas: contacts } }, { headers });
  }
  const contatoId = Number(q.get("contato"));
  const target = Number.isInteger(contatoId) && contatoId > 0
    ? await prisma.waContact.findUnique({ where: { id: contatoId }, select: { id: true, isOwner: true } })
    : await prisma.waContact.findFirst({ where: { isOwner: true }, select: { id: true, isOwner: true } });
  const owner = target;
  if (!owner) return NextResponse.json({ ok: true, data: { mensagens: [] } });
  const rows = await prisma.waMessage.findMany({
    where: { contactId: owner.id, createdAt: { gte: since } },
    orderBy: { id: "asc" },
    take: 600,
    select: { id: true, createdAt: true, direction: true, author: true, type: true, text: true, fileName: true, action: true, actionDoneAt: true },
  });
  return NextResponse.json(
    { ok: true, data: { contato: owner.id, dias, total: rows.length, mensagens: rows.map((r) => linha(r, owner.isOwner ? "leonardo" : "cliente")) } },
    { headers },
  );
}
