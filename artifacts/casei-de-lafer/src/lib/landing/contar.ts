// Conta o toque num botão da página inicial (rotas /conversar e /whatsapp). Só roda no servidor.
// - Conta só GET (o HEAD que o navegador ou um verificador de link faz não entra).
// - Só grava no banco em produção: as prévias da Vercel usam o banco de produção e não podem sujar o número.
// - Roda depois de a resposta sair (after): nem demora nem derruba o redirecionamento se o banco falhar.
// - O log do servidor guarda a mesma informação, sem IP nem identificador.

import { after, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { botaoDe, campanhaDoReferer, type Botao } from "./links.ts";
import { campanhaAGravar, chaveDoToque, diaSaoPaulo, prefixoDoDia, type Canal } from "./toques.ts";

async function gravar(canal: Canal, botao: Botao | "outro", campanha: string) {
  const dia = diaSaoPaulo(new Date());
  const [linhasDoDia, existente] = await Promise.all([
    prisma.setting.count({ where: { key: { startsWith: prefixoDoDia(dia) } } }),
    prisma.setting.findUnique({ where: { key: chaveDoToque(dia, canal, botao, campanha) }, select: { key: true } }),
  ]);
  const chave = chaveDoToque(dia, canal, botao, campanhaAGravar(campanha, linhasDoDia, Boolean(existente)));
  // Soma atômica: dois toques ao mesmo tempo não perdem contagem.
  await prisma.$executeRaw`
    INSERT INTO "Setting" ("key", "value", "updatedAt")
    VALUES (${chave}, '1', NOW() AT TIME ZONE 'UTC')
    ON CONFLICT ("key") DO UPDATE
    SET "value" = (CAST("Setting"."value" AS INTEGER) + 1)::text, "updatedAt" = NOW() AT TIME ZONE 'UTC'`;
}

/** Lê botão e campanha do pedido, conta o toque e devolve os dois (a rota usa para montar o redirecionamento). */
export function contarToque(req: NextRequest, canal: Canal): { botao: Botao | "outro"; campanha: string } {
  const botao = botaoDe(req.nextUrl.searchParams.get("b"));
  const campanha = campanhaDoReferer(req.headers.get("referer"));
  if (req.method === "GET") {
    console.info(JSON.stringify({ evento: "toque_botao", canal, botao, campanha }));
    if (process.env["VERCEL_ENV"] === "production") {
      after(() => gravar(canal, botao, campanha).catch((e) => console.error("[toques] falha ao contar", e)));
    }
  }
  return { botao, campanha };
}
