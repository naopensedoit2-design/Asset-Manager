import { NextRequest } from "next/server";
import { ok, route, type IdContext } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

/** O que valeria se o pedido fosse excluído agora: a tela mostra o aviso certo antes do botão final. */
export const GET = route(async (_req: NextRequest, ctx: IdContext) =>
  ok((await gestor.previewOrderDeletion((await ctx.params).id)).verdict),
);
