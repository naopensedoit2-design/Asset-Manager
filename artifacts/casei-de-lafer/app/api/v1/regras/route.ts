import { ok, agentRoute } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const GET = agentRoute(async () => ok(await gestor.getSettings()));
