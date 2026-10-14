import { NextRequest } from "next/server";
import { ok, readJson, route } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok(await gestor.getSettings()));

export const PUT = route(async (req: NextRequest) => ok(await gestor.saveSettings(await readJson(req))));
