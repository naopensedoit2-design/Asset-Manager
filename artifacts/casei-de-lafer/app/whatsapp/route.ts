import { NextRequest, NextResponse } from "next/server";
import { contarToque } from "@/lib/landing/contar";
import { getNumeroWhatsapp } from "@/lib/landing/dados";
import { MENSAGEM_WHATSAPP } from "@/lib/landing/conteudo";
import { botaoDe } from "@/lib/landing/links";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Botões de WhatsApp da página inicial. O número fica só aqui, no servidor: o toque funciona antes de o JavaScript
// carregar e uma troca de número no painel vale na hora. Sem número cadastrado, o toque segue para o chat (e é contado lá).
export async function GET(req: NextRequest) {
  const numero = await getNumeroWhatsapp();
  // Endereço relativo: vale em qualquer domínio (produção, prévia, local) sem depender do host que o servidor enxerga.
  if (!numero) {
    const para = `/conversar?${new URLSearchParams({ b: botaoDe(req.nextUrl.searchParams.get("b")) })}`;
    return new NextResponse(null, { status: 302, headers: { Location: para, "Cache-Control": "no-store" } });
  }
  contarToque(req, "whatsapp");
  const resposta = NextResponse.redirect(getWhatsAppUrl(numero, MENSAGEM_WHATSAPP), 302);
  // Nada de guardar o redirecionamento: cada toque tem de passar por aqui para ser contado.
  resposta.headers.set("Cache-Control", "no-store");
  return resposta;
}
