// Resgate de mensagem sem resposta. Puro: decide se uma conversa ficou sem resposta por falha (função cortada
// no meio, erro da IA) e merece uma nova tentativa. Uma tentativa por mensagem.

export interface UltimaEntrada {
  isOwner: boolean;
  ignored: boolean;
  paused: boolean;
  blocked: boolean;
  /** Margot ligada para clientes (Regras). O modo secretária responde sempre. */
  margotOn: boolean;
  /** Última mensagem da pessoa: quando chegou e se já foi marcada como tratada. */
  lastIn: { createdAt: Date; handled: boolean } | null;
  /** Houve mensagem de saída (Margot, dono ou sistema) depois dela? */
  respondida: boolean;
  /** Já tentamos de novo esta mensagem. */
  jaResgatada: boolean;
}

const MIN = 60_000;

/** Tratada, sem resposta, entre 3 e 60 min atrás, numa conversa que a Margot deveria responder. */
export function precisaResgate(c: UltimaEntrada, now: Date): boolean {
  if (c.ignored || c.blocked || c.paused || c.jaResgatada || c.respondida) return false;
  if (!c.isOwner && !c.margotOn) return false;
  if (!c.lastIn || !c.lastIn.handled) return false;
  const idade = now.getTime() - c.lastIn.createdAt.getTime();
  return idade >= 3 * MIN && idade <= 60 * MIN;
}
