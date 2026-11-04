// Página pública "Datas livres": quais dias mostrar e a mensagem pronta do WhatsApp de cada um. Puro, sem banco.

import { addDays, formatDateBR } from "./rules.ts";

const WEEKDAY = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Dia da semana de uma data AAAA-MM-DD (0 = domingo), sem depender do fuso do servidor. */
export function diaDaSemana(data: string): number {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}

export interface DiaLivre {
  data: string;
  /** "sábado, 12/12" */
  rotulo: string;
  fimDeSemana: boolean;
}

/**
 * Dias livres de amanhã até `ate` (inclusive), na ordem. Sexta, sábado e domingo vêm marcados como fim de semana;
 * a página mostra esses primeiro, mas os outros dias também estão livres (ensaio pode ser em qualquer dia).
 */
export function datasLivres(dias: { data: string; status: string }[], hoje: string, ate: string): DiaLivre[] {
  const amanha = addDays(hoje, 1);
  return dias
    .filter((d) => d.status === "livre" && d.data >= amanha && d.data <= ate)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((d) => {
      const w = diaDaSemana(d.data);
      return { data: d.data, rotulo: `${WEEKDAY[w]}, ${formatDateBR(d.data).slice(0, 5)}`, fimDeSemana: w === 0 || w === 5 || w === 6 };
    });
}

/** Meses (ano, mês) entre hoje e `ate`, para buscar a disponibilidade. */
export function mesesAte(hoje: string, ate: string): { ano: number; mes: number }[] {
  const out: { ano: number; mes: number }[] = [];
  let y = Number(hoje.slice(0, 4));
  let m = Number(hoje.slice(5, 7));
  const end = Number(ate.slice(0, 4)) * 12 + Number(ate.slice(5, 7));
  while (y * 12 + m <= end && out.length < 24) {
    out.push({ ano: y, mes: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Último dia do mês seguinte ao de hoje (a página mostra o mês atual e o próximo). */
export function fimDoProximoMes(hoje: string): string {
  let y = Number(hoje.slice(0, 4));
  let m = Number(hoje.slice(5, 7)) + 2;
  if (m > 12) {
    m -= 12;
    y += 1;
  }
  return addDays(`${y}-${String(m).padStart(2, "0")}-01`, -1);
}

/** De onde veio quem abriu a página (?origem=anuncio, ?origem=instagram). Só valores conhecidos. */
export function origemDaPagina(raw: unknown): "anuncio" | "instagram" | "site" {
  return raw === "anuncio" ? "anuncio" : raw === "instagram" ? "instagram" : "site";
}

/** Mensagem pronta do WhatsApp. Cita a data e de onde a pessoa veio, para a Margot já saber o contexto. */
export function mensagemDaData(dia: DiaLivre | null, origem: "anuncio" | "instagram" | "site"): string {
  const onde = origem === "anuncio" ? "Vi o anúncio" : origem === "instagram" ? "Vi no Instagram" : "Vi no site";
  return dia
    ? `Oi! ${onde} que o dia ${formatDateBR(dia.data)} (${dia.rotulo.split(",")[0]}) está livre. Quero saber sobre o MP Lafer para essa data.`
    : `Oi! ${onde} as datas livres do MP Lafer. Quero consultar uma data.`;
}
