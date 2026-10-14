import { NextRequest } from "next/server";
import { ok, agentRoute, type IdContext } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const POST = agentRoute(async (_req: NextRequest, ctx: IdContext) =>
  ok(await gestor.reserveOrder((await ctx.params).id, "margot"), 201),
);
