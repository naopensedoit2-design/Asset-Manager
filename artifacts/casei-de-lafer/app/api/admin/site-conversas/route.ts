import { ok, route } from "@/lib/gestor/http";
import { listarConversas } from "@/lib/margot/site-conversas-service";

export const dynamic = "force-dynamic";

// Lista das conversas do chat do site (só o painel; protegida pelo middleware de /api/admin).
export const GET = route(async () => ok(await listarConversas()));
