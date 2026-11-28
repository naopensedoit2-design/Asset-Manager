// Quando uma conversa ainda espera resposta de verdade da nossa equipe.
// A última mensagem é da pessoa: espera. Mas também espera quando a última que saiu foi só um acolhimento
// automático do sistema, que diz "nossa equipe responde em breve" e não responde nada: a reserva da Margot quando a
// IA falhou (kind "reserva") e a resposta automática quando a Margot não pôde responder ("resposta_automatica").
// Sem isso, essas conversas sumiam de Hoje e do modo secretária como se estivessem resolvidas (caso de 28/11/2026:
// duas clientes atendidas só pela reserva, e a secretária dizia "nenhuma conversa esperando").
// O pedido de reenvio ("sem_suporte") não entra: ali quem precisa agir é a pessoa.

/** Tipos de mensagem do sistema que só acolhem e prometem retorno da equipe. */
export const SO_ACOLHIMENTO = ["reserva", "resposta_automatica"] as const;

export interface UltimaMensagem {
  direction: string;
  author: string;
  kind: string;
}

/** A última mensagem que saiu foi só um acolhimento automático (a pessoa ainda não teve resposta de verdade)? */
export function soAcolhimento(last: UltimaMensagem | null | undefined): boolean {
  if (!last || last.direction !== "out") return false;
  return last.author === "sistema" && (SO_ACOLHIMENTO as readonly string[]).includes(last.kind);
}

/** A conversa espera resposta da equipe: a pessoa falou por último, ou só recebeu um acolhimento automático. */
export function esperaResposta(last: UltimaMensagem | null | undefined): boolean {
  if (!last) return false;
  return last.direction === "in" || soAcolhimento(last);
}

/**
 * Situação da IA para o modo secretária, em palavras do dono. `falha` é a última vez que a Margot ficou sem IA
 * (Setting margotSemIA). Quem lê isto é a própria secretária, que roda na IA: se ela está respondendo, a IA voltou.
 * Serve para ela não contar uma falha antiga como se fosse de agora (nem oferecer corrigir o que já foi corrigido).
 */
export function estadoIA(falha: { at: number; motivo: string } | null, formatar: (d: Date) => string): string {
  if (!falha) return "Sem falha da IA registrada.";
  return `Última falha da IA: ${formatar(new Date(falha.at))} (${falha.motivo}). Agora a IA está funcionando (é ela que está respondendo): é coisa passada, não diga que o erro continua. As conversas daquela hora que ainda esperam resposta aparecem em conversas_esperando.`;
}

/** Lê o valor gravado em margotSemIA; null se vazio ou inválido. */
export function parseFalhaIA(valor: string | null | undefined): { at: number; motivo: string } | null {
  if (!valor) return null;
  try {
    const v = JSON.parse(valor) as { at?: unknown; motivo?: unknown };
    if (typeof v.at !== "number" || typeof v.motivo !== "string") return null;
    return { at: v.at, motivo: v.motivo };
  } catch {
    return null;
  }
}
