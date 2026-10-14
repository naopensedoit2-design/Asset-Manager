import { NextRequest } from "next/server";
import { ok, route } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) =>
  ok(await gestor.monthAvailability(req.nextUrl.searchParams.get("ano"), req.nextUrl.searchParams.get("mes"))),
);
