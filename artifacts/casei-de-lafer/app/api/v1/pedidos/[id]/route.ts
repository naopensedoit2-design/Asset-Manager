import { NextRequest } from "next/server";
import { ok, readJson, agentRoute, type IdContext } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const GET = agentRoute(async (_req: NextRequest, ctx: IdContext) => ok(await gestor.getOrder((await ctx.params).id)));

export const PATCH = agentRoute(async (req: NextRequest, ctx: IdContext) =>
  ok(await gestor.updateOrder((await ctx.params).id, await readJson(req), "margot")),
);
