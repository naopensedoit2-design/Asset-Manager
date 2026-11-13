// Botão de confirmação repetido: a mesma ação, ainda sem resposta, proposta duas vezes em pouco tempo.
// Aconteceu com a baixa de um saldo: o comprovante e o pedido chegaram em mensagens separadas,
// a Margot respondeu às duas e o dono recebeu dois botões iguais, com um "toque em Cancelar neste".

/** Por quanto tempo um botão sem resposta segura outro igual. */
export const JANELA_REPETIDA_MS = 30 * 60_000;

export type BotaoPendente = { id: number; action: string; createdAt: Date; actionDoneAt: Date | null };

/** JSON com as chaves em ordem: a mesma ação escrita em outra ordem continua sendo a mesma. */
export function acaoCanonica(json: string): string {
  try {
    return JSON.stringify(ordenar(JSON.parse(json)));
  } catch {
    return json;
  }
}

function ordenar(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(ordenar);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>)
        .sort()
        .map((k) => [k, ordenar((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

/** Id do botão igual ainda pendente e recente, ou null quando vale mandar um novo. */
export function botaoRepetido(pendentes: BotaoPendente[], action: string, now = new Date()): number | null {
  const alvo = acaoCanonica(action);
  const limite = now.getTime() - JANELA_REPETIDA_MS;
  const igual = pendentes
    .filter((b) => b.actionDoneAt === null && b.createdAt.getTime() >= limite && acaoCanonica(b.action) === alvo)
    .sort((a, b) => b.id - a.id)[0];
  return igual ? igual.id : null;
}
