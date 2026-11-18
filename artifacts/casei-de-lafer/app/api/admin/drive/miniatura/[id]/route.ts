import { NextRequest, NextResponse } from "next/server";
import { ErroDoDrive, miniatura } from "@/lib/google/drive";

export const dynamic = "force-dynamic";

// Miniatura de uma foto do Drive para o painel (só fotos da pasta escolhida).
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const { bytes, tipo } = await miniatura(id);
    return new NextResponse(new Uint8Array(bytes), { headers: { "content-type": tipo, "cache-control": "private, max-age=3600" } });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof ErroDoDrive ? e.message : "Falha ao ler a foto." }, { status: 404 });
  }
}
