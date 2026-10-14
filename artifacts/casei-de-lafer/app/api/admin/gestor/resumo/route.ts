import { ok, route } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok(await gestor.getDashboard()));
