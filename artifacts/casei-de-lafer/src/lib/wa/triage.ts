// Quem a Margot deixa de atender. Puro: testado em triage.test.ts.
//
// Um número que já foi de outra pessoa (ou que cai em lista de transmissão) recebe corrente, vídeo de "bom dia"
// e figurinha de gente que nunca vai contratar. Essas conversas ficam "ignoradas": a mensagem é guardada (dá para
// ler na aba Ignoradas), mas a Margot não responde, o dono não é avisado e nada conta como não lida.
// O dono ignora e reativa qualquer conversa à mão. Sozinho, só o PRIMEIRO contato de um número novo é ignorado,
// e só quando parece mensagem em massa.

/** Por que a conversa está ignorada (WaContact.ignoredReason). "manual" = o dono decidiu; os outros vêm da triagem. */
export type IgnoreReason = "manual" | "encaminhada" | "figurinha" | "video" | "contato" | "localizacao" | "engano";

const LABEL: Record<IgnoreReason, string> = {
  manual: "Ignorada por você",
  encaminhada: "Começou com mensagem encaminhada",
  figurinha: "Começou com figurinha",
  video: "Começou com vídeo",
  contato: "Começou com um contato",
  localizacao: "Começou com uma localização",
  engano: "Mensagem por engano (a Margot percebeu)",
};

/** Texto curto do motivo, para a lista e para a faixa da conversa. */
export function ignoreLabel(reason: string): string {
  return LABEL[reason as IgnoreReason] ?? LABEL.manual;
}

/** A conversa foi ignorada pela triagem (não pelo dono)? Só essas voltam sozinhas. */
export function isAutoIgnored(reason: string): boolean {
  return reason !== "" && reason !== "manual";
}

/** Frase da faixa que aparece dentro de uma conversa ignorada. */
export function ignoreExplanation(reason: string): string {
  if (!isAutoIgnored(reason)) return "Você ignorou esta conversa. A Margot não responde nem avisa, e nada conta como não lido.";
  return `Ignorada sozinha: ${ignoreLabel(reason).toLowerCase()}. A Margot não responde nem avisa. Se a pessoa escrever sobre casamento, carro ou valor, a conversa volta sozinha.`;
}

export interface TriageMessage {
  type: string;
  text: string;
  forwarded: boolean;
}

const plain = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/** Palavras de quem quer contratar. Sem acento e só no começo da palavra ("preservar" não vale como "reservar"). */
const LEAD = new RegExp(
  "\\b(" +
    [
      "casamento",
      "casar",
      "casei",
      "noiv",
      "cerimoni",
      "ensaio",
      "wedding",
      "prewedding",
      "fotograf",
      "carro",
      "lafer",
      "fusca",
      "conversivel",
      "orcamento",
      "valor",
      "preco",
      "quanto (custa|fica|sai|cobra)",
      "disponib",
      "reserv",
      "contrat",
      "instagram",
    ].join("|") +
    ")",
);

/** O texto fala de casamento, carro ou valor? */
export function looksLikeLead(text: string): boolean {
  return LEAD.test(plain(text));
}

/**
 * Primeira mensagem de um número novo que parece mensagem em massa: encaminhada, figurinha, vídeo, contato ou
 * localização. Foto, áudio, documento e texto não entram: é assim que um casal de verdade costuma começar.
 */
export function firstContactReason(m: TriageMessage): IgnoreReason | null {
  if (m.forwarded) return "encaminhada";
  if (looksLikeLead(m.text)) return null; // legenda falando de casamento, carro ou valor: merece resposta
  switch (m.type) {
    case "sticker":
      return "figurinha";
    case "video":
      return "video";
    case "contacts":
      return "contato";
    case "location":
      return "localizacao";
    default:
      return null;
  }
}

export interface ContactState {
  /** Esta é a primeira mensagem deste número. */
  isNew: boolean;
  isOwner: boolean;
  /** O telefone já é de um cliente do painel. */
  isClient: boolean;
  ignored: boolean;
  /** Motivo atual (vazio quando não está ignorada). */
  reason: string;
}

export interface TriageDecision {
  /** A conversa fica ignorada depois desta mensagem? */
  ignored: boolean;
  reason: string;
  /** O que mudou: começou a ser ignorada, voltou, ou nada. */
  change: "ignorar" | "reativar" | null;
}

/**
 * Decide o que fazer com uma mensagem que chegou:
 *  - o dono nunca é ignorado (se o número dele já estava ignorado, volta);
 *  - ignorada pelo dono continua ignorada, mesmo que a pessoa escreva de casamento;
 *  - ignorada pela triagem volta sozinha quando a pessoa escreve (sem encaminhar) sobre casamento, carro ou valor;
 *  - número novo, que não é cliente, e cuja primeira mensagem parece em massa, passa a ser ignorado.
 */
export function triageInbound(state: ContactState, m: TriageMessage): TriageDecision {
  if (state.isOwner) {
    return state.ignored ? { ignored: false, reason: "", change: "reativar" } : { ignored: false, reason: "", change: null };
  }
  if (state.ignored) {
    if (isAutoIgnored(state.reason) && !m.forwarded && looksLikeLead(m.text)) {
      return { ignored: false, reason: "", change: "reativar" };
    }
    return { ignored: true, reason: state.reason || "manual", change: null };
  }
  if (state.isNew && !state.isClient) {
    const reason = firstContactReason(m);
    if (reason) return { ignored: true, reason, change: "ignorar" };
  }
  return { ignored: false, reason: "", change: null };
}
