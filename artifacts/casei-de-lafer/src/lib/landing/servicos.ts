// Que serviços e valores a página pública mostra, a partir dos serviços cadastrados em Regras.
// Mesma regra da Margot: os principais aparecem com "a partir de" (o valor-base); a Saída dos Noivos
// aparece como adicional, sem valor; os outros adicionais (como o de região) são ajustes do orçamento
// e não aparecem. Nenhum valor é digitado aqui: tudo vem do painel.

import { isSaidaDosNoivos } from "../margot/prompt.ts";

export interface ServicoDoPainel {
  name: string;
  description: string;
  priceCents: number;
  isAddon: boolean;
}

export interface ServicoPublico {
  nome: string;
  descricao: string;
  /** Valor-base em centavos. null quando o serviço aparece sem valor (adicional combinado com a equipe). */
  aPartirDeCents: number | null;
  adicional: boolean;
}

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function servicosPublicos(servicos: readonly ServicoDoPainel[]): ServicoPublico[] {
  const lista: ServicoPublico[] = [];
  for (const s of servicos) {
    if (!s.isAddon && s.priceCents > 0) {
      lista.push({ nome: s.name, descricao: s.description, aPartirDeCents: s.priceCents, adicional: false });
    } else if (isSaidaDosNoivos(s)) {
      lista.push({ nome: s.name, descricao: s.description, aPartirDeCents: null, adicional: true });
    }
  }
  return lista;
}

/** Valor-base do Carro da Noiva, em centavos; null se o painel não tiver o serviço. */
export function precoCarroDaNoiva(servicos: readonly ServicoDoPainel[]): number | null {
  const noiva = servicos.find((s) => !s.isAddon && s.priceCents > 0 && normalizar(s.name).includes("noiva"));
  return noiva ? noiva.priceCents : null;
}
