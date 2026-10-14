import { NextRequest } from "next/server";
import { ok, readJson, route, type IdContext } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const PATCH = route(async (req: NextRequest, ctx: IdContext) =>
  ok(await gestor.updatePayment((await ctx.params).id, await readJson(req), "admin")),
);
