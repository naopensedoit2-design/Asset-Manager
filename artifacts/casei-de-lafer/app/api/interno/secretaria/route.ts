import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { linha, leituraPermitida } from "@/lib/wa/leitura";

export const dynamic = "force-dynamic";

/**
 * Conversa do dono com a Margot (modo secretária), para o Claude analisar e melhorar a Margot.
 * Só pelo endereço *.vercel.app (atrás da Vercel Authentication) e com LEITURA_SECRETARIA=1. Somente leitura.
 * ?dias=1..31 (padrão 2).
 */
export async function GET(req: NextRequest) {
  // Os dois cabeçalhos de endereço, quando existem, têm de ser *.vercel.app.
  const hosts = [req.headers.get("host"), req.headers.get("x-forwarded-host")].filter((h): h is string => !!h);
  if (!hosts.length || !hosts.every((h) => leituraPermitida(h, process.env.LEITURA_SECRETARIA))) {
    return NextResponse.json({ ok: false, error: "não encontrado" }, { status: 404 });
  }
  const dias = Math.min(Math.max(Number(req.nextUrl.searchParams.get("dias")) || 2, 1), 31);
  const owner = await prisma.waContact.findFirst({ where: { isOwner: true }, select: { id: true } });
  if (!owner) return NextResponse.json({ ok: true, data: { mensagens: [] } });
  const rows = await prisma.waMessage.findMany({
    where: { contactId: owner.id, createdAt: { gte: new Date(Date.now() - dias * 86_400_000) } },
    orderBy: { id: "asc" },
    take: 600,
    select: { id: true, createdAt: true, direction: true, author: true, type: true, text: true, fileName: true, action: true, actionDoneAt: true },
  });
  return NextResponse.json(
    { ok: true, data: { dias, total: rows.length, mensagens: rows.map(linha) } },
    { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );
}
