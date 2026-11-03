// Ordem da lista de Conversas do painel.
// 1) a conversa do dono com a Margot, sempre primeiro; 2) as fixadas à mão, na ordem escolhida (arrastar);
// 3) o resto por prioridade, que sai só de sinais que o sistema já tem; dentro de cada grupo, a mais recente primeiro.

export interface OrdemItem {
  id: number;
  isOwner: boolean;
  /** Posição fixada à mão (menor = mais acima); null = ordem automática. */
  pinOrder: number | null;
  /** A última mensagem é da pessoa e ainda não foi respondida (aviso do WhatsApp sem conteúdo não conta). */
  waiting: boolean;
  /** A última mensagem é um aviso do WhatsApp sem conteúdo (enquete, "ver uma vez", chamada…). */
  onlyNotice: boolean;
  hasOrder: boolean;
  lastMessageAt: string | null;
}

/** Quanto menor, mais acima: pedido esperando, esperando resposta, pedido em andamento, o resto, e por fim só aviso do WhatsApp. */
export function prioridade(c: Pick<OrdemItem, "waiting" | "onlyNotice" | "hasOrder">): number {
  if (c.onlyNotice) return 4;
  if (c.waiting && c.hasOrder) return 0;
  if (c.waiting) return 1;
  if (c.hasOrder) return 2;
  return 3;
}

const when = (c: OrdemItem) => (c.lastMessageAt ? Date.parse(c.lastMessageAt) : 0);

export function ordenar<T extends OrdemItem>(list: readonly T[]): T[] {
  const group = (c: T) => (c.isOwner ? 0 : c.pinOrder !== null ? 1 : 2);
  return [...list].sort((a, b) => {
    const g = group(a) - group(b);
    if (g) return g;
    if (group(a) === 1) return (a.pinOrder as number) - (b.pinOrder as number) || a.id - b.id;
    if (group(a) === 2) {
      const p = prioridade(a) - prioridade(b);
      if (p) return p;
    }
    return when(b) - when(a) || b.id - a.id;
  });
}

/** Posição de uma conversa recém-fixada: acima de todas as já fixadas. */
export function proximaPosicaoNoTopo(posicoes: readonly (number | null)[]): number {
  const nums = posicoes.filter((n): n is number => n !== null);
  return nums.length ? Math.min(...nums) - 1 : 0;
}

/** Valida a lista de ids enviada ao arrastar: só números inteiros, sem repetição. */
export function idsDeOrdem(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 200) return null;
  const ids = raw.map((n) => (typeof n === "number" ? n : Number.NaN));
  if (!ids.every((n) => Number.isInteger(n) && n > 0)) return null;
  return new Set(ids).size === ids.length ? ids : null;
}

export type Tom = "dono" | "pedido" | "esperando" | "pausada" | "aviso" | "normal";

/** A cor da conversa na lista: uma só por linha, na ordem de importância. */
export function tom(c: { isOwner: boolean; hasOrder: boolean; waiting: boolean; onlyNotice: boolean; paused: boolean }): Tom {
  if (c.isOwner) return "dono";
  if (c.onlyNotice) return "aviso";
  if (c.hasOrder) return "pedido";
  if (c.waiting) return "esperando";
  if (c.paused) return "pausada";
  return "normal";
}
