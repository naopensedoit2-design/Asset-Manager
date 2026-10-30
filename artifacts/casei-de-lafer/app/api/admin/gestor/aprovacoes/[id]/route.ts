import { NextRequest } from "next/server";
import { ok, readJson, route, type IdContext } from "@/lib/gestor/http";
import { RuleError } from "@/lib/gestor/rules";
import { resolveAction } from "@/lib/wa/actions";
import { ownerContact } from "@/lib/wa/store";

export const dynamic = "force-dynamic";

// POST /api/admin/gestor/aprovacoes/:id  { acao: "confirmar" | "cancelar" }
// É o mesmo "Confirmar / Cancelar" que a Margot manda no WhatsApp, só que aqui no painel.
// Quem executa é resolveAction (a Margot só propõe); ele já impede executar duas vezes e recusa o que expirou.
export const POST = route(async (req: NextRequest, ctx: IdContext) => {
  const { id } = await ctx.params;
  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId <= 0) throw new RuleError("id_invalido", "Confirmação inválida.", 400);
  const body = await readJson(req);
  if (body.acao !== "confirmar" && body.acao !== "cancelar") {
    throw new RuleError("acao_invalida", "Use \"confirmar\" ou \"cancelar\".", 400);
  }
  const owner = await ownerContact();
  if (!owner) throw new RuleError("sem_dono", "Preencha \"Seu WhatsApp pessoal\" nas Regras primeiro.", 400);
  const mensagem = await resolveAction(owner, rowId, body.acao === "confirmar");
  return ok({ mensagem });
});
