import { NextRequest } from "next/server";
import { agentRoute, ok, readJson } from "@/lib/gestor/http";
import { saveExpense } from "@/lib/gestor/finance-service";

export const dynamic = "force-dynamic";

// Para a Margot lançar gastos que o Leonardo informar pelo WhatsApp.
export const POST = agentRoute(async (req: NextRequest) => ok(await saveExpense(await readJson(req), "margot"), 201));
