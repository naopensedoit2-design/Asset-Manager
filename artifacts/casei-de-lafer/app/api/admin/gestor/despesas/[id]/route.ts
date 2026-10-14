import { NextRequest } from "next/server";
import { ok, readJson, route, type IdContext } from "@/lib/gestor/http";
import { deleteExpense, saveExpense } from "@/lib/gestor/finance-service";

export const dynamic = "force-dynamic";

export const PATCH = route(async (req: NextRequest, ctx: IdContext) =>
  ok(await saveExpense({ ...(await readJson(req)), id: (await ctx.params).id }, "admin")),
);

export const DELETE = route(async (_req: NextRequest, ctx: IdContext) => ok(await deleteExpense((await ctx.params).id)));
