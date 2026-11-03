import { NextRequest } from "next/server";
import { ok, readJson, route } from "@/lib/gestor/http";
import { reorderPinned } from "@/lib/wa/admin";

export const dynamic = "force-dynamic";

// PUT { ids: [3, 1, 2] } → grava a ordem das conversas fixadas, de cima para baixo (arrastar na lista).
export const PUT = route(async (req: NextRequest) => {
  const body = await readJson(req);
  return ok(await reorderPinned(body.ids));
});
