import { NextRequest } from "next/server";
import { ok, route } from "@/lib/gestor/http";
import { getFinance } from "@/lib/gestor/finance-service";

export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) => ok(await getFinance(req.nextUrl.searchParams.get("periodo"))));
