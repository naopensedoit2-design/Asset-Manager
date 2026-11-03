// Nome do arquivo e cabeçalhos de segurança da mídia que o painel mostra. Puro: testado em media-file.test.ts.

/** Content-Disposition que aguenta qualquer nome de arquivo (acento, emoji): cabeçalho HTTP só aceita Latin-1. */
export function disposition(kind: "inline" | "attachment", name: string): string {
  if (!name) return kind;
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const utf8 = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/3gpp": "3gp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "application/pdf": "pdf",
};

/** Nome para salvar o arquivo: o que a pessoa mandou ou, quando o WhatsApp não manda nome (foto, vídeo, áudio), "midia-<id>.<extensão>". */
export function downloadName(fileName: string, mime: string, id: string): string {
  const given = fileName.trim();
  if (given) return given;
  const ext = EXTENSION[mime.split(";")[0].trim().toLowerCase()];
  const safeId = id.replace(/[^\w-]/g, "").slice(0, 24) || "arquivo";
  return `midia-${safeId}${ext ? `.${ext}` : ""}`;
}

/**
 * Política de segurança da resposta: mesmo que alguém consiga abrir o arquivo como página, nada nele executa
 * (sem script, sem quadro, sem formulário). Foto, vídeo e áudio abertos direto numa aba precisam carregar a si
 * mesmos (img-src e media-src), o navegador põe na página um estilo que mostra o arquivo (style-src) e o player
 * pede o arquivo como a própria origem (allow-same-origin; sem allow-scripts isso não deixa nada rodar).
 * PDF fica sem esta regra: o visualizador do Chrome não abre PDF com ela, e um PDF não roda script na página.
 */
export function mediaCsp(mime: string): string | null {
  if (mime === "application/pdf") return null;
  return "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox allow-same-origin";
}
