import { ok, route } from "@/lib/gestor/http";
import { getHoje } from "@/lib/admin/hoje-service";

export const dynamic = "force-dynamic";

// GET /api/admin/gestor/hoje — tudo que a tela "Hoje" mostra, num pacote só.
export const GET = route(async () => ok(await getHoje()));
