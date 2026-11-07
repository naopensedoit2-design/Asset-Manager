import { NextRequest } from "next/server";
import { ok, readJson, route, type IdContext } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const GET = route(async (_req: NextRequest, ctx: IdContext) => ok(await gestor.getOrder((await ctx.params).id)));

export const PATCH = route(async (req: NextRequest, ctx: IdContext) =>
  ok(await gestor.updateOrder((await ctx.params).id, await readJson(req), "admin")),
);

/** Excluir de vez: sem pagamento recebido, ou duplicado comprovado (regra em src/lib/gestor/exclusao.ts). */
export const DELETE = route(async (_req: NextRequest, ctx: IdContext) => ok(await gestor.deleteOrder((await ctx.params).id, "admin")));
