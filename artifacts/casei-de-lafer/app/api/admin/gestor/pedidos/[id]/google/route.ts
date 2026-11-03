import { NextRequest } from "next/server";
import { ok, route, type IdContext } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

// De qual casamento da Google Agenda o pedido veio (título só para o dono; nunca vai para /api/v1).
export const GET = route(async (_req: NextRequest, ctx: IdContext) => ok(await gestor.orderGoogleLink((await ctx.params).id)));

// Liga o pedido a um casamento da Google Agenda do mesmo dia: { eventId }.
export const POST = route(async (req: NextRequest, ctx: IdContext) => {
  const body = await req.json().catch(() => ({}));
  return ok(await gestor.linkOrderToGoogle((await ctx.params).id, body?.eventId));
});
