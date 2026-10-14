import { NextRequest } from "next/server";
import { ok, readJson, route } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) =>
  ok(await gestor.listOrders({ status: req.nextUrl.searchParams.get("status"), q: req.nextUrl.searchParams.get("q") })),
);

export const POST = route(async (req: NextRequest) => ok(await gestor.createOrder(await readJson(req), "admin"), 201));
