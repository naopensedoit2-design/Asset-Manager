import { NextRequest } from "next/server";
import { ok, readJson, agentRoute } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const GET = agentRoute(async (req: NextRequest) =>
  ok(await gestor.listOrders({ status: req.nextUrl.searchParams.get("status"), q: req.nextUrl.searchParams.get("telefone") ?? req.nextUrl.searchParams.get("q") })),
);

export const POST = agentRoute(async (req: NextRequest) => ok(await gestor.createOrder(await readJson(req), "margot"), 201));
