// Mídias recebidas que o modelo consegue "ver": fotos (JPEG, PNG, WebP, GIF) e PDFs.
// Úteis para comprovantes de Pix, notas fiscais e fotos do local.

import { downloadMedia } from "./client";
import type { WaMessage } from "./store";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 4_500_000;

export function visibleMedia(messages: WaMessage[]): WaMessage[] {
  return messages.filter((m) => {
    const mime = m.mediaMime.split(";")[0].trim();
    return m.mediaId && ((m.type === "image" && IMAGE_TYPES.includes(mime)) || (m.type === "document" && mime === "application/pdf"));
  });
}

/** Blocos de imagem/PDF (base64) para anexar à última mensagem do histórico. No máximo 3. */
export async function mediaBlocks(messages: WaMessage[]): Promise<unknown[]> {
  const blocks: unknown[] = [];
  for (const m of visibleMedia(messages).slice(-3)) {
    const mime = m.mediaMime.split(";")[0].trim();
    try {
      const { data } = await downloadMedia(m.mediaId);
      if (data.length > MAX_BYTES) continue;
      blocks.push(
        m.type === "image"
          ? { type: "image", source: { type: "base64", media_type: mime, data: data.toString("base64") } }
          : { type: "document", source: { type: "base64", media_type: "application/pdf", data: data.toString("base64") } },
      );
    } catch (e) {
      console.error("[whatsapp] mídia para a Margot", e);
    }
  }
  return blocks;
}

/** Junta texto e mídias na última mensagem (que precisa ser da pessoa). */
export function attachMedia(messages: { role: string; content: unknown }[], blocks: unknown[]) {
  if (!blocks.length || !messages.length) return;
  const last = messages[messages.length - 1];
  if (last.role !== "user") return;
  last.content = [{ type: "text", text: String(last.content) }, ...blocks];
}
