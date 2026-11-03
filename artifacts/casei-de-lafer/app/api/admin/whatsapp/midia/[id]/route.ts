import { NextRequest } from "next/server";
import { downloadMedia, explainError } from "@/lib/wa/client";
import { createMediaCache, type CachedMedia } from "@/lib/wa/media-cache";
import { contentRange, MAX_SLICE, parseByteRange } from "@/lib/wa/range";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Mostra no painel uma foto, vídeo, áudio ou documento da conversa (a Meta guarda por cerca de 30 dias).
// Só abre mídias que estão em alguma conversa, para o painel não virar um proxy aberto.
//
// Vídeo e áudio chegam em pedaços (resposta 206): a Vercel recusa resposta acima de 4,5 MB e o iPhone só toca
// mídia se o servidor aceitar o cabeçalho Range. Veja src/lib/wa/range.ts.

/** Arquivos baixados há pouco: o player pede vários pedaços e cada um não precisa baixar tudo da Meta de novo. */
const cache = createMediaCache({ maxBytes: 48 * 1024 * 1024, ttlMs: 5 * 60_000 });

/**
 * Tipos que o navegador pode mostrar direto no painel. Qualquer outro (HTML, SVG, script…) vira download:
 * quem manda para o número da Margot pode ser um desconhecido, e um arquivo desses aberto no endereço do painel
 * rodaria com o acesso do Leonardo.
 */
const INLINE = /^(image\/(jpeg|png|webp|gif)|audio\/[\w.+-]+|video\/[\w.+-]+|application\/pdf)$/;

/** Content-Disposition que aguenta qualquer nome de arquivo (acento, emoji): cabeçalho HTTP só aceita Latin-1. */
function disposition(kind: "inline" | "attachment", name: string): string {
  if (!name) return kind;
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const utf8 = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

/** Arquivo grande, pedido inteiro (sem Range): vai aos poucos, porque resposta em fluxo não tem o limite de 4,5 MB. */
function streamOf(data: Buffer): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= data.length) return controller.close();
      const next = Math.min(i + 256 * 1024, data.length);
      controller.enqueue(new Uint8Array(data.subarray(i, next)));
      i = next;
    },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const mediaId = (await ctx.params).id;
  const known = await prisma.waMessage.findFirst({ where: { mediaId }, select: { mediaMime: true, fileName: true } });
  if (!known) return new Response("Mídia não encontrada", { status: 404 });

  let file: CachedMedia;
  try {
    file = await cache.getOrLoad(mediaId, async () => {
      const { data, mime } = await downloadMedia(mediaId);
      return { data, mime };
    });
  } catch (e) {
    return new Response(explainError(e), { status: 502 });
  }

  const declared = (file.mime || known.mediaMime || "application/octet-stream").split(";")[0].trim().toLowerCase();
  const inline = INLINE.test(declared);
  const size = file.data.length;
  const headers: Record<string, string> = {
    "Content-Type": inline ? declared : "application/octet-stream",
    "Content-Disposition": disposition(inline ? "inline" : "attachment", known.fileName || (inline ? "" : "arquivo")),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=86400",
    // Mesmo que alguém consiga abrir o arquivo como página, nada nele executa. (PDF fica de fora: o visualizador
    // do Chrome não abre PDF com esta regra, e um PDF não roda script na página.)
    "X-Content-Type-Options": "nosniff",
    ...(declared === "application/pdf" ? {} : { "Content-Security-Policy": "default-src 'none'; sandbox" }),
  };

  const range = parseByteRange(req.headers.get("range"), size);
  if (range === "invalido") {
    return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  }
  if (range) {
    const part = file.data.subarray(range.start, range.end + 1);
    return new Response(new Uint8Array(part), {
      status: 206,
      headers: { ...headers, "Content-Range": contentRange(range, size), "Content-Length": String(part.length) },
    });
  }
  if (size > MAX_SLICE) return new Response(streamOf(file.data), { status: 200, headers });
  return new Response(new Uint8Array(file.data), { status: 200, headers: { ...headers, "Content-Length": String(size) } });
}
