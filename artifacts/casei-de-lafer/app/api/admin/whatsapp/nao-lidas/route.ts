import { ok, route } from "@/lib/gestor/http";
import { unreadTotal } from "@/lib/wa/admin";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok({ total: await unreadTotal() }));
