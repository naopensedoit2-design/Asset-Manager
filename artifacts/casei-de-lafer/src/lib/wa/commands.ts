// Interruptor geral da Margot: "pausar Margot" e "retomar Margot" escritos (ou falados) pelo Leonardo.
//
// Vale ANTES de qualquer IA: não depende da chave da API, do limite de gasto nem do modelo entender a frase.
// Um freio de emergência não pode falhar quando o resto está falhando. Módulo puro, sem imports.

export type KillCommand = "pausar" | "retomar";

/** O que está ligado hoje (Regras): atendimento a clientes no WhatsApp e no chat do site. */
export interface KillState {
  margotWhatsapp: boolean;
  margotSite: boolean;
}

export interface KillPlan {
  /** O que gravar nas Regras (vazio quando já estava assim). */
  changes: Partial<KillState>;
  /** O que responder ao Leonardo. */
  reply: string;
}

/** Tira acentos, pontuação, emojis e caixa: "Pausar Margot! 🛑" vira "pausar margot". */
export function normalizeCommand(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Palavras que podem acompanhar o verbo sem mudar o sentido. Qualquer outra palavra ("pausa para o
// almoço", "pausar a Margot com a Ana") deixa de ser o comando geral e segue para a Margot interpretar.
const FILLER = new Set(["a", "o", "margot", "tudo", "geral", "por", "favor", "pf", "pfv", "agora", "ja"]);

// Verbos que sozinhos já são o comando.
const PAUSE_STRONG = new Set(["pausar", "pausa", "pause"]);
const RESUME_STRONG = new Set(["retomar", "retome", "reativar", "reative", "despausar"]);
// Verbos comuns demais para valer sozinhos ("ligar" pode ser uma ligação): pedem "Margot", "tudo" ou "geral".
const PAUSE_WEAK = new Set(["parar", "pare", "desligar", "desliga", "desligue"]);
const RESUME_WEAK = new Set(["ligar", "liga", "ligue", "religar", "religue", "voltar", "volta", "volte"]);

/** Devolve o comando se a mensagem INTEIRA for só isso; senão, null. */
export function parseKillCommand(text: string): KillCommand | null {
  const tokens = normalizeCommand(String(text ?? ""))
    .split(" ")
    .filter(Boolean);
  if (!tokens.length || tokens.length > 6) return null;
  const verbs = tokens.filter((t) => !FILLER.has(t));
  if (verbs.length !== 1) return null;
  const verb = verbs[0];
  const named = tokens.some((t) => t === "margot" || t === "tudo" || t === "geral");
  if (PAUSE_STRONG.has(verb)) return "pausar";
  if (RESUME_STRONG.has(verb)) return "retomar";
  if (named && PAUSE_WEAK.has(verb)) return "pausar";
  if (named && RESUME_WEAK.has(verb)) return "retomar";
  return null;
}

/** Decide o que gravar e o que responder. Pausar e retomar mexem nas duas chaves juntas. */
export function planKillCommand(cmd: KillCommand, now: KillState): KillPlan {
  if (cmd === "pausar") {
    if (!now.margotWhatsapp && !now.margotSite) {
      return { changes: {}, reply: "A Margot já estava pausada. Para ligar de novo, mande *retomar Margot*." };
    }
    return {
      changes: { margotWhatsapp: false, margotSite: false },
      reply:
        "⏸️ *Margot pausada.* Ela não responde mais clientes, nem no WhatsApp nem no chat do site. " +
        "O que chegar no WhatsApp aparece em Conversas e eu te aviso aqui; o chat do site manda a pessoa para o seu WhatsApp. " +
        "Seus botões de confirmação e esta conversa continuam funcionando. Para ligar de novo, mande *retomar Margot*.",
    };
  }
  if (now.margotWhatsapp && now.margotSite) {
    return { changes: {}, reply: "A Margot já estava ligada. Para pausar, mande *pausar Margot*." };
  }
  return {
    changes: { margotWhatsapp: true, margotSite: true },
    reply: "▶️ *Margot de volta.* Ela volta a responder clientes no WhatsApp e no chat do site. Para pausar de novo, mande *pausar Margot*.",
  };
}

/**
 * Quando não deu para gravar (ex.: banco fora do ar), o Leonardo precisa saber que NÃO mudou e o que fazer no painel.
 * A gravação é uma transação só (as duas chaves ou nenhuma), então "continua como estava" é verdade.
 */
export function killFailedReply(cmd: KillCommand): string {
  const chaves = '"Margot responde clientes no WhatsApp" e "Margot responde no chat do site"';
  return cmd === "pausar"
    ? `⚠️ Não consegui pausar agora (o banco não respondeu), então a Margot continua como estava. Pause pelo painel: Regras → desligue ${chaves}.`
    : `⚠️ Não consegui retomar agora (o banco não respondeu), então a Margot continua como estava. Ligue pelo painel: Regras → ligue ${chaves}.`;
}
