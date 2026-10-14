import { NextRequest } from "next/server";
import { ok, readJson, route, type IdContext } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const POST = route(async (req: NextRequest, ctx: IdContext) =>
  ok(await gestor.createQuote((await ctx.params).id, await readJson(req), "admin"), 201),
);
