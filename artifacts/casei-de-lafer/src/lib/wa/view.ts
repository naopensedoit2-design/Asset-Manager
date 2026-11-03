// Como cada mensagem aparece na conversa do painel (/admin/conversas). Puro: testado em view.test.ts.

export const TZ = "America/Sao_Paulo";

export type MessageView =
  | "text"
  | "image"
  | "sticker"
  | "video"
  | "audio"
  | "document"
  | "location"
  | "contacts"
  | "reaction"
  | "notice";

interface Viewable {
  type: string;
  mediaId: string;
  mediaMime: string;
}

const MEDIA_TYPES = ["image", "sticker", "audio", "video", "document"];
/** Tipos que o WhatsApp manda sem conteúdo útil: aparecem como aviso, nunca como balão vazio. */
export const NOTICE_TYPES = ["unsupported", "unknown", "system", "ephemeral", "request_welcome", "order"];

/** Qual desenho usar para a mensagem. Avisos com foto (ex.: comprovante com botões) chegam como "interactive": decide pelo arquivo. */
export function viewKind(m: Viewable): MessageView {
  if (m.type === "reaction") return "reaction";
  if (m.type === "location") return "location";
  if (m.type === "contacts") return "contacts";
  if (NOTICE_TYPES.includes(m.type)) return "notice";
  if (!m.mediaId) return MEDIA_TYPES.includes(m.type) ? "notice" : "text";
  if (MEDIA_TYPES.includes(m.type)) return m.type as MessageView;
  const mime = m.mediaMime.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

/** Texto do aviso que substitui uma mensagem sem conteúdo para mostrar. */
export function noticeText(type: string, text: string): string {
  if (MEDIA_TYPES.includes(type)) return "Arquivo indisponível: a Meta guarda as mídias por cerca de 30 dias.";
  switch (type) {
    case "unsupported":
      return "O WhatsApp não entrega este tipo de mensagem por aqui (por exemplo enquete, “ver uma vez” ou chamada).";
    case "unknown":
      return "Mensagem de um tipo que o painel não conhece.";
    case "request_welcome":
      return "A pessoa abriu a conversa com a Margot.";
    case "order":
      return "A pessoa enviou um pedido pelo catálogo do WhatsApp.";
    case "system":
      return text.trim() || "Aviso do WhatsApp.";
    default:
      return text.trim() || `Mensagem do tipo “${type}”.`;
  }
}

// ─── Localização e contatos ──────────────────────────────────
// O parse.ts guarda os dois como texto legível; aqui o texto vira cartão.

export function parseLocation(text: string): { label: string; lat: number; lng: number } | null {
  const m = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*$/.exec(text);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return null;
  return { label: text.slice(0, m.index).trim(), lat, lng };
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function parseContacts(text: string): { name: string; phones: string[] }[] {
  return text
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const i = part.indexOf(":");
      if (i < 0) return { name: part, phones: [] };
      return {
        name: part.slice(0, i).trim(),
        phones: part
          .slice(i + 1)
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      };
    });
}

export const telUrl = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

// ─── Lista de conversas ──────────────────────────────────────

const PREVIEW_LABEL: Record<string, string> = {
  image: "📷 Foto",
  audio: "🎤 Áudio",
  document: "📄 Documento",
  video: "🎬 Vídeo",
  sticker: "Figurinha",
  location: "📍 Localização",
  contacts: "👤 Contato",
  template: "Aviso modelo",
  unsupported: "Mensagem não suportada",
};

/** Quem escreveu a última mensagem (some quando foi a pessoa: o nome já está na linha de cima). */
export function previewWho(last: { direction: string; author: string }): string {
  if (last.direction === "in") return "";
  return last.author === "leonardo" ? "Você: " : last.author === "margot" ? "Margot: " : "Automático: ";
}

/** Texto da prévia da última mensagem, sem o "quem" (ver previewWho). */
export function previewBody(last: { type: string; text: string }): string {
  const label = PREVIEW_LABEL[last.type];
  if (!last.text) return label ?? "Mensagem";
  return label && last.type !== "template" ? `${label} · ${last.text}` : last.text;
}

/** Iniciais para o círculo de cada conversa. Vazio quando o nome não tem letras (só número de telefone). */
export function initials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\s&]/gu, "")
    .split(/\s|&/)
    .filter(Boolean);
  if (!parts.length) return "";
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ─── Conversa: agrupamento dos balões ────────────────────────

/** Dia (aaaa-mm-dd) no fuso de Brasília. */
export function dayKeyBR(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

interface Flowing {
  direction: string;
  author: string;
  type: string;
  mediaId: string;
  mediaMime: string;
  createdAt: string;
}

/**
 * Marca cada mensagem com `newDay` (começa um dia novo: mostra o separador) e `first` (primeira de uma
 * sequência do mesmo lado: ganha o "rabinho" do balão e mais espaço em cima, como no WhatsApp).
 */
export function chatFlow<T extends Flowing>(messages: T[]): { m: T; newDay: boolean; first: boolean }[] {
  const centered = (m: Flowing) => ["reaction", "notice"].includes(viewKind(m));
  return messages.map((m, i) => {
    const prev = messages[i - 1];
    const newDay = !prev || dayKeyBR(prev.createdAt) !== dayKeyBR(m.createdAt);
    const first =
      newDay || !prev || centered(prev) || prev.direction !== m.direction || (m.direction === "out" && prev.author !== m.author);
    return { m, newDay, first };
  });
}
