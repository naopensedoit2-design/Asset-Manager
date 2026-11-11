// Quando a Margot pede ajuda à equipe várias vezes na mesma conversa, o dono precisa
// receber cada assunto novo, mas não o mesmo assunto repetido em sequência.

/** Dentro desta janela, o mesmo assunto não gera outro aviso. */
export const JANELA_AVISO_MS = 10 * 60_000;

/** Chave em Setting com o último aviso de uma conversa (sem coluna nova no banco). */
export const AVISO_PREFIX = "ultimoAviso:";

export interface UltimoAviso {
  at: number;
  motivo: string;
}

const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Avisa se não houve aviso recente desta conversa ou se o assunto é outro. */
export function deveAvisar(anterior: UltimoAviso | null, agora: number, motivo: string): boolean {
  if (!anterior || agora - anterior.at >= JANELA_AVISO_MS) return true;
  const a = normalizar(anterior.motivo);
  const b = normalizar(motivo);
  if (!a || !b) return false;
  return !(a === b || a.includes(b) || b.includes(a));
}

export function lerUltimoAviso(valor: string | null | undefined): UltimoAviso | null {
  if (!valor) return null;
  try {
    const v = JSON.parse(valor);
    return typeof v?.at === "number" && typeof v?.motivo === "string" ? { at: v.at, motivo: v.motivo } : null;
  } catch {
    return null;
  }
}
