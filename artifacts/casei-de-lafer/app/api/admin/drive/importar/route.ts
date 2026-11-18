import { NextRequest, NextResponse } from "next/server";
import { ErroDoDrive, importar } from "@/lib/google/drive";
import { montarLocal } from "@/lib/landing/curadoria";
import { atualizarPaginaInicial } from "@/lib/landing/revalidar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Importa UMA foto do Drive para a galeria (o painel chama uma vez por foto, por causa do tempo da função).
export async function POST(request: NextRequest) {
  const corpo = (await request.json().catch(() => ({}))) as { id?: string; credito?: string };
  if (!corpo.id || typeof corpo.id !== "string") return NextResponse.json({ erro: "Foto não informada." }, { status: 400 });
  try {
    const r = await importar(corpo.id, montarLocal(null, typeof corpo.credito === "string" ? corpo.credito : ""));
    if (r.nova) atualizarPaginaInicial();
    return NextResponse.json({ ok: true, nova: r.nova, id: r.foto.id });
  } catch (e) {
    console.error("[drive] importar", e);
    return NextResponse.json({ erro: e instanceof ErroDoDrive ? e.message : "Não consegui importar esta foto." }, { status: 502 });
  }
}
