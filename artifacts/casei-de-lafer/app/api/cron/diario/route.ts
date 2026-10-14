import { ok, cronRoute } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const GET = cronRoute(async () => ok(await gestor.runDailyRoutine()));
