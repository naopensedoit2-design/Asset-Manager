import { NextRequest } from "next/server";
import { downloadMedia, explainError } from "@/lib/wa/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Mostra no painel uma foto, áudio ou documento da conversa (a Meta guarda por cerca de 30 dias).
// Só abre mídias que estão em alguma conversa, para o painel não virar um proxy aberto.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const mediaId = (await ctx.params).id;
  const known = await prisma.waMessage.findFirst({ where: { mediaId }, select: { mediaMime: true, fileName: true } });
  if (!known) return new Response("Mídia não encontrada", { status: 404 });
  try {
    const { data, mime } = await downloadMedia(mediaId);
    const type = (mime || known.mediaMime || "application/octet-stream").split(";")[0];
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=86400",
        ...(known.fileName ? { "Content-Disposition": `inline; filename="${known.fileName.replace(/["\r\n]/g, "")}"` } : {}),
      },
    });
  } catch (e) {
    return new Response(explainError(e), { status: 502 });
  }
}
