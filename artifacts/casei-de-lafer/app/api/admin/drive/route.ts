import { NextRequest, NextResponse } from "next/server";
import { escolherPasta, listarFotos } from "@/lib/google/drive";
import { idDaPasta } from "@/lib/google/drive-regras";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Fotos da pasta do Google Drive escolhida no painel (Site → Galeria). Protegida pelo middleware de /api/admin.
export async function GET() {
  return NextResponse.json(await listarFotos());
}

/** Guarda a pasta: aceita o link do Drive ou o id. */
export async function POST(request: NextRequest) {
  const corpo = (await request.json().catch(() => ({}))) as { pasta?: string };
  const id = idDaPasta(corpo.pasta);
  if (!id) return NextResponse.json({ erro: "Não reconheci o link. Copie o link da pasta no Drive (Compartilhar → Copiar link)." }, { status: 400 });
  await escolherPasta(id);
  return NextResponse.json(await listarFotos());
}
