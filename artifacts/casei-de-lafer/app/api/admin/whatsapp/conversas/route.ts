import { NextRequest } from "next/server";
import { ok, route } from "@/lib/gestor/http";
import { listConversations } from "@/lib/wa/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/whatsapp/conversas[?pedido=12 | ?ignoradas=1]
export const GET = route(async (req: NextRequest) => {
  const pedido = Number(req.nextUrl.searchParams.get("pedido"));
  if (Number.isInteger(pedido) && pedido > 0) return ok(await listConversations({ orderId: pedido }));
  return ok(await listConversations({ ignored: req.nextUrl.searchParams.get("ignoradas") === "1" }));
});
