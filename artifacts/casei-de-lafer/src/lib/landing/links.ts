// Para onde cada botão da página aponta. Os dois canais passam por uma rota do próprio site (/conversar e /whatsapp):
// o toque funciona antes de o JavaScript carregar, o número do WhatsApp fica só no servidor e cada toque pode ser
// contado por botão e por campanha, sem cookie.

import { ACAO_PRINCIPAL } from "./conteudo.ts";

export const BOTOES = ["topo", "valores", "final", "rodape"] as const;
export type Botao = (typeof BOTOES)[number];

export type Tipo = "chat" | "whatsapp";
export interface Acao {
  tipo: Tipo;
  href: string;
}

/** Quais canais estão de pé agora: o chat da Margot (ligado, com chave e dentro do limite) e o WhatsApp (com número). */
export interface Canais {
  chat: boolean;
  whatsapp: boolean;
}

export const botaoDe = (valor: string | null | undefined): Botao | "outro" =>
  (BOTOES as readonly string[]).includes(valor ?? "") ? (valor as Botao) : "outro";

export const hrefChat = (botao: Botao) => `/conversar?b=${botao}`;
export const hrefWhatsapp = (botao: Botao) => `/whatsapp?b=${botao}`;

/**
 * Ação grande e, ao lado dela em texto, a outra. Se o canal preferido estiver fora do ar, o outro assume a ação
 * grande; sem nenhum dos dois, não há botão (a página mostra um aviso em vez de um botão que não leva a lugar nenhum).
 */
export function acoes(
  botao: Botao,
  canais: Canais,
  principal: Tipo = ACAO_PRINCIPAL,
): { principal: Acao | null; secundaria: Acao | null } {
  const chat: Acao | null = canais.chat ? { tipo: "chat", href: hrefChat(botao) } : null;
  const whatsapp: Acao | null = canais.whatsapp ? { tipo: "whatsapp", href: hrefWhatsapp(botao) } : null;
  const [preferida, outra] = principal === "whatsapp" ? [whatsapp, chat] : [chat, whatsapp];
  return preferida ? { principal: preferida, secundaria: outra } : { principal: outra, secundaria: null };
}

const CAMPANHA_VALIDA = /^[a-z0-9_-]{1,40}$/i;

/** Campanha do anúncio (utm_campaign) lida do endereço da página de onde a pessoa veio. Só letras, números, - e _. */
export function campanhaDoReferer(referer: string | null | undefined): string {
  if (!referer) return "sem-origem";
  try {
    const campanha = new URL(referer).searchParams.get("utm_campaign");
    return campanha && CAMPANHA_VALIDA.test(campanha) ? campanha.toLowerCase() : "sem-campanha";
  } catch {
    return "sem-origem";
  }
}

/** A campanha é de verdade (veio de um anúncio) ou é um dos valores vazios acima? */
export const campanhaReal = (campanha: string) => campanha !== "sem-origem" && campanha !== "sem-campanha";
