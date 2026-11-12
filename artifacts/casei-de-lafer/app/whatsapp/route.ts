import { NextResponse } from "next/server";
import { getNumeroWhatsapp } from "@/lib/landing/dados";
import { CHAT_URL, MENSAGEM_WHATSAPP } from "@/lib/landing/links";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Botões de WhatsApp da página inicial. O número fica só aqui, no servidor: o toque funciona antes de o
// JavaScript carregar e uma troca de número no painel vale na hora. Sem número cadastrado, o toque segue
// para o chat (endereço relativo: vale em produção, na prévia e localmente).
export async function GET() {
  const numero = await getNumeroWhatsapp();
  const destino = numero ? getWhatsAppUrl(numero, MENSAGEM_WHATSAPP) : CHAT_URL;
  return new NextResponse(null, {
    status: 302,
    headers: { Location: destino, "Cache-Control": "no-store" },
  });
}
