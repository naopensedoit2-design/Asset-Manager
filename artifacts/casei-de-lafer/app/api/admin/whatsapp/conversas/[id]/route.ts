import { NextRequest } from "next/server";
import { ok, readJson, route, type IdContext } from "@/lib/gestor/http";
import { RuleError } from "@/lib/gestor/rules";
import { getConversation, markConversationRead, sendAsLeonardo, setPaused } from "@/lib/wa/admin";

export const dynamic = "force-dynamic";

async function idOf(ctx: IdContext) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) throw new RuleError("id_invalido", "Conversa inválida.", 400);
  return id;
}

// Abrir a conversa marca como lida.
export const GET = route(async (_req: NextRequest, ctx: IdContext) => {
  const id = await idOf(ctx);
  const data = await getConversation(id);
  await markConversationRead(id);
  return ok(data);
});

// POST { texto } → envia como Leonardo (a Margot pausa nesta conversa por 24h).
export const POST = route(async (req: NextRequest, ctx: IdContext) => {
  const body = await readJson(req);
  return ok(await sendAsLeonardo(await idOf(ctx), String(body.texto ?? "")));
});

// PATCH { pausar: true|false }
export const PATCH = route(async (req: NextRequest, ctx: IdContext) => {
  const body = await readJson(req);
  return ok(await setPaused(await idOf(ctx), Boolean(body.pausar)));
});
