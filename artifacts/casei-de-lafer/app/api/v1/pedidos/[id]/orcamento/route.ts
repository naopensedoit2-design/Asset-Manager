import { NextRequest } from "next/server";
import { ok, readJson, agentRoute, type IdContext } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const POST = agentRoute(async (req: NextRequest, ctx: IdContext) =>
  ok(await gestor.createQuote((await ctx.params).id, await readJson(req), "margot"), 201),
);
