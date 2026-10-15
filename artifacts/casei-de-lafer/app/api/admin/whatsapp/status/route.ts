import { NextRequest } from "next/server";
import { ok, readJson, route } from "@/lib/gestor/http";
import { connectionAction, connectionStatus } from "@/lib/wa/admin";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok(await connectionStatus()));

// POST { acao: "registrar", pin } | { acao: "assinar" } | { acao: "teste" }
export const POST = route(async (req: NextRequest) => {
  const body = await readJson(req);
  return ok(await connectionAction(String(body.acao ?? ""), body));
});
