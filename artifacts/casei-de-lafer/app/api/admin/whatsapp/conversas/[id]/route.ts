import { NextRequest } from "next/server";
import { ok, readJson, route, type IdContext } from "@/lib/gestor/http";
import { RuleError } from "@/lib/gestor/rules";
import { blockContact, getConversation, markConversationRead, sendAsLeonardo, setIgnored, setPaused, unblockContact } from "@/lib/wa/admin";

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

// PATCH { pausar: true|false } → pausa ou retoma a Margot nesta conversa.
// PATCH { acao: "ignorar" | "reativar" | "bloquear" | "desbloquear" } → ver src/lib/wa/admin.ts.
export const PATCH = route(async (req: NextRequest, ctx: IdContext) => {
  const body = await readJson(req);
  const id = await idOf(ctx);
  switch (body.acao) {
    case undefined:
      return ok(await setPaused(id, Boolean(body.pausar)));
    case "ignorar":
      return ok(await setIgnored(id, true));
    case "reativar":
      return ok(await setIgnored(id, false));
    case "bloquear":
      return ok(await blockContact(id));
    case "desbloquear":
      return ok(await unblockContact(id));
    default:
      throw new RuleError("acao_invalida", "Ação desconhecida.", 400);
  }
});
