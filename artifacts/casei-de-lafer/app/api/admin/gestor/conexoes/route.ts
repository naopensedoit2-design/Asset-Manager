import { ok, route } from "@/lib/gestor/http";
import { getConexoes } from "@/lib/admin/conexoes-service";

export const dynamic = "force-dynamic";

// GET /api/admin/gestor/conexoes — estado de cada canal e serviço, só pela configuração (não chama Meta nem Google).
export const GET = route(async () => ok(await getConexoes()));
