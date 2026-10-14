import { NextRequest } from "next/server";
import { ok, readJson, route } from "@/lib/gestor/http";
import { listExpenses, saveExpense } from "@/lib/gestor/finance-service";

export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) =>
  ok(await listExpenses({ period: req.nextUrl.searchParams.get("periodo"), status: req.nextUrl.searchParams.get("status") })),
);

export const POST = route(async (req: NextRequest) => ok(await saveExpense(await readJson(req), "admin"), 201));
