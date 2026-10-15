import { NextRequest } from "next/server";
import { ok, route, type IdContext } from "@/lib/gestor/http";
import { ensurePublicToken } from "@/lib/documents/data";
import { RuleError } from "@/lib/gestor/rules";

export const dynamic = "force-dynamic";

// Cria (uma vez) o link privado e devolve os caminhos da proposta e do termo.
export const POST = route(async (_req: NextRequest, ctx: IdContext) => {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) throw new RuleError("id_invalido", "Pedido inválido.", 400);
  const token = await ensurePublicToken(id);
  return ok({ proposta: `/p/${token}`, termo: `/t/${token}` });
});
