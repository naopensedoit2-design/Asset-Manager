import { NextRequest, NextResponse } from "next/server";
import { contarToque } from "@/lib/landing/contar";
import { CHAT_URL } from "@/lib/landing/conteudo";
import { campanhaReal } from "@/lib/landing/links";

export const dynamic = "force-dynamic";

// Botões do chat da Margot na página inicial. Conta o toque (por botão e campanha) e leva ao chat, repassando de onde
// a pessoa veio (?b=botão&c=campanha) para o chat poder usar isso depois. O chat ignora parâmetros que não conhece.
export async function GET(req: NextRequest) {
  const { botao, campanha } = contarToque(req, "chat");
  const destino = new URLSearchParams({ b: botao });
  if (campanhaReal(campanha)) destino.set("c", campanha);
  return new NextResponse(null, {
    status: 302,
    headers: { Location: `${CHAT_URL}?${destino.toString()}`, "Cache-Control": "no-store" },
  });
}
