import { NextRequest } from "next/server";
import { ok, readJson, route, type IdContext } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const POST = route(async (req: NextRequest, ctx: IdContext) => {
  const body = await readJson(req);
  return ok(await gestor.changeStatus((await ctx.params).id, body.status, "admin", String(body.note ?? "")));
});
