import { fail, ok, route } from "@/lib/gestor/http";
import { idDeConversa } from "@/lib/margot/site-conversas";
import { lerConversa } from "@/lib/margot/site-conversas-service";

export const dynamic = "force-dynamic";

// Uma conversa do chat do site, fala por fala.
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const id = idDeConversa((await ctx.params).id);
  if (!id) return fail("conversa_invalida", "Conversa não encontrada.", 404);
  return ok(await lerConversa(id));
});
