// Contagem de toques nos botões da página inicial, sem cookie, sem IP e sem tabela nova: uma linha na tabela Setting
// por dia, canal, botão e campanha, com o número de toques no valor. A parte que grava no banco está em contar.ts;
// aqui ficam só as regras puras (testadas).

import type { Botao } from "./links.ts";

export type Canal = "chat" | "whatsapp";

/** Acima disso, campanhas novas do mesmo dia entram como "outra" (um endereço de origem inventado não enche a tabela). */
export const MAX_LINHAS_POR_DIA = 300;
export const PREFIXO = "clique:";

/** Dia no fuso de São Paulo (aaaa-mm-dd), que é o dia que o dono enxerga. */
export function diaSaoPaulo(agora: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
  return partes; // en-CA já formata aaaa-mm-dd
}

/** Mês no fuso de São Paulo (aaaa-mm). Servidor (UTC) e navegador (Brasil) discordam do mês nas últimas 3 horas dele. */
export const mesSaoPaulo = (agora: Date): string => diaSaoPaulo(agora).slice(0, 7);

export const prefixoDoDia = (dia: string) => `${PREFIXO}${dia}:`;

export function chaveDoToque(dia: string, canal: Canal, botao: Botao | "outro", campanha: string): string {
  return `${prefixoDoDia(dia)}${canal}:${botao}:${campanha}`;
}

/** Campanha a gravar: a própria, ou "outra" se o dia já tem linhas demais e esta combinação ainda não existe. */
export function campanhaAGravar(campanha: string, linhasDoDia: number, jaExiste: boolean): string {
  return jaExiste || linhasDoDia < MAX_LINHAS_POR_DIA ? campanha : "outra";
}
