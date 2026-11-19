// Pedaços do resumo do dia (summary.ts) que não dependem do banco. Testado em resumo.test.ts.

/** Tipos que chegam sem pedir resposta (reação, aviso de sistema do WhatsApp…): nunca contam como "esperando resposta". */
export const SILENT_TYPES = ["reaction", "system", "request_welcome", "ephemeral"];

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Linha "Conversas (24 h)" do resumo: o dono pediu um relatório das conversas todo dia, mesmo sem nada pendente. */
export function conversasLinha(c: { escreveram: number; esperando: number }): string {
  if (!c.escreveram) return "*Conversas (24 h):* nenhum cliente escreveu.";
  const respondidas = Math.max(c.escreveram - c.esperando, 0);
  return `*Conversas (24 h):* ${[
    `${plural(c.escreveram, "cliente escreveu", "clientes escreveram")}`,
    `${plural(respondidas, "respondida", "respondidas")}`,
    c.esperando ? `${plural(c.esperando, "esperando", "esperando")} resposta` : "",
  ]
    .filter(Boolean)
    .join(" · ")}`;
}

/** Texto curto do aviso modelo (conversa de 24 h fechada). Sem nada pendente, diz isso em vez de ficar mudo. */
export function resumoParte(partes: string[]): string {
  return `resumo do dia: ${partes.length ? partes.join(", ") : "nada pendente"}`;
}
