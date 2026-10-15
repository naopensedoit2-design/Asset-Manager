import { NextRequest } from "next/server";
import { loadDocData } from "@/lib/documents/data";
import { renderProposal } from "@/lib/documents/proposal";
import { html, notFound } from "@/lib/documents/respond";

export const dynamic = "force-dynamic";

// Proposta comercial do pedido, por link privado (/p/<código>).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const data = await loadDocData((await ctx.params).token);
  return data ? html(renderProposal(data)) : notFound();
}
