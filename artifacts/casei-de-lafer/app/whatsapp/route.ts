import { NextRequest, NextResponse } from "next/server";
import { CHAT_URL, mensagemWhatsapp, parceiroDe } from "@/lib/landing/links";
import { margotNumber } from "@/lib/wa/numero-margot";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Botões de WhatsApp da página inicial. Levam ao número da Margot (o oficial da Meta, o mesmo da página
// /datas), lido no servidor: o toque funciona antes de o JavaScript carregar. Sem a Meta configurada, vale
// o número do painel. Sem número cadastrado, o toque segue
// para o chat (endereço relativo: vale em produção, na prévia e localmente).
// O formulário da página manda a data (aaaa-mm-dd) e a cidade: as duas entram na mensagem já preenchidas.
// "p" diz que quem fala é um parceiro (cerimonialista ou fotógrafo). Tudo é conferido em links.ts.
export async function GET(req: NextRequest) {
  const numero = await margotNumber().catch(() => "");
  const busca = req.nextUrl.searchParams;
  const mensagem = mensagemWhatsapp({
    data: busca.get("data"),
    local: busca.get("local"),
    parceiro: parceiroDe(busca.get("p")),
  });
  const destino = numero ? getWhatsAppUrl(numero, mensagem) : CHAT_URL;
  return new NextResponse(null, {
    status: 302,
    headers: { Location: destino, "Cache-Control": "no-store" },
  });
}
