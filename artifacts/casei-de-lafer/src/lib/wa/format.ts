// Texto no formato do WhatsApp e leitura de respostas curtas. Puro: testado em wa.test.ts.

/** Converte o markdown que o modelo às vezes escreve para a formatação do WhatsApp (*negrito*, _itálico_). */
export function toWhatsApp(md: string): string {
  return (md ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/__(.+?)__/g, "_$1_")
    .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label: string, url: string) => (label === url ? url : `${label}: ${url}`))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Uma linha só, para parâmetros de modelos (templates): a Meta recusa quebra de linha,
 * tabulação e mais de 4 espaços seguidos.
 */
export function oneLine(text: string, max = 900): string {
  const flat = (text ?? "")
    .replace(/\s*\n+\s*/g, " · ")
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/^[\s·]+|[\s·]+$/g, "");
  return truncate(flat, max);
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Divide textos longos (limite do WhatsApp: 4096 caracteres) em parágrafos inteiros quando possível. */
export function splitText(text: string, max = 4000): string[] {
  const out: string[] = [];
  let rest = (text ?? "").trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n\n", max);
    if (cut < max / 2) cut = rest.lastIndexOf("\n", max);
    if (cut < max / 2) cut = rest.lastIndexOf(" ", max);
    if (cut < max / 2) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** Título de botão: no máximo 20 caracteres. */
export function buttonTitle(text: string): string {
  return truncate(text.trim(), 20);
}

function normalize(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,;:!?¡¿"'()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Respostas que valem como "sim" para uma confirmação pendente. Lista fechada de propósito:
// "sim, mas muda o valor" não pode confirmar nada.
const YES = new Set([
  "sim", "s", "ss", "isso", "isso mesmo", "pode", "pode sim", "pode mandar", "pode lancar", "pode confirmar",
  "confirmo", "confirma", "confirmado", "confirmar", "ok", "okay", "beleza", "blz", "fechado", "certo", "manda",
  "envia", "lanca", "sim pode", "sim confirmo", "sim pode mandar", "👍", "✅", "👌",
]);
const NO = new Set([
  "nao", "n", "nao precisa", "cancela", "cancelar", "cancelado", "deixa", "deixa pra la", "esquece", "nao manda",
  "nao envia", "agora nao", "ainda nao", "❌", "👎",
]);
const TRIVIAL = new Set([
  "oi", "ola", "opa", "e ai", "eai", "bom dia", "boa tarde", "boa noite", "ok", "ver", "ver agora", "?", "👍",
  "oi margot", "ola margot", "fala", "fala margot", "tudo bem", "oi tudo bem",
]);

export const isAffirmative = (text: string) => YES.has(normalize(text));
export const isNegative = (text: string) => NO.has(normalize(text));
/** Mensagem que só "abre a conversa" (por exemplo, depois de um aviso), sem pedido real. */
export const isTrivial = (text: string) => TRIVIAL.has(normalize(text)) || normalize(text) === "";
