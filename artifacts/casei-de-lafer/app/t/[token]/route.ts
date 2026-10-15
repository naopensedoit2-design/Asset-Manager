import { NextRequest } from "next/server";
import { loadDocData } from "@/lib/documents/data";
import { renderTermo } from "@/lib/documents/termo";
import { html, notFound } from "@/lib/documents/respond";

export const dynamic = "force-dynamic";

// Termo Simplificado do pedido, por link privado (/t/<código>).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const data = await loadDocData((await ctx.params).token);
  return data ? html(renderTermo(data)) : notFound();
}
