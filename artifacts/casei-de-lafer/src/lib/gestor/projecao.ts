// Projeção de faturamento e lucro para um ano, em cenários de eventos por mês.
// Regra pura (sem banco): a Margot passa os números e repete o que esta conta devolve,
// em vez de calcular de cabeça.

export interface ProjecaoInput {
  /** Cenários: quantos eventos por mês (ex.: [2, 4, 6]). */
  eventosPorMes: number[];
  /** Valor médio cobrado por evento. */
  ticketCents: number;
  /** Custos que existem todo mês, com ou sem evento (seguro, sistemas, marketing...). */
  custoFixoMensalCents: number;
  /** Custo que só existe quando há evento (combustível, lavagem...). */
  custoPorEventoCents: number;
  /** Reserva anual para manutenção do carro (gasto que não é todo mês). */
  manutencaoAnualCents: number;
  /** Quantos meses projetar (padrão 12). */
  meses?: number;
}

export interface Cenario {
  eventosMes: number;
  eventosAno: number;
  faturamentoCents: number;
  custosCents: number;
  lucroCents: number;
  lucroMesCents: number;
  /** Lucro sobre faturamento, em % inteiro; null quando não há faturamento. */
  margemPct: number | null;
}

export interface Projecao {
  meses: number;
  cenarios: Cenario[];
  /** Eventos por mês para empatar (lucro zero); null se cada evento não cobre o próprio custo. */
  equilibrioEventosMes: number | null;
  avisos: string[];
}

/** Um carro, um evento por dia: acima disto o mês depende de dias de semana. */
export const FINS_DE_SEMANA_POR_MES = 8;

const inteiro = (n: unknown) => Math.max(0, Math.round(Number(n) || 0));

export function projetarAno(input: ProjecaoInput): Projecao {
  const meses = Math.min(Math.max(inteiro(input.meses ?? 12), 1), 24);
  const ticket = inteiro(input.ticketCents);
  const fixo = inteiro(input.custoFixoMensalCents);
  const porEvento = inteiro(input.custoPorEventoCents);
  const manutencao = inteiro(input.manutencaoAnualCents);
  // Manutenção é anual: proporcional aos meses projetados.
  const manutencaoPeriodo = Math.round((manutencao * meses) / 12);

  const cenariosIn = [...new Set((input.eventosPorMes ?? []).map(inteiro))].sort((a, b) => a - b);
  const cenarios: Cenario[] = cenariosIn.map((eventosMes) => {
    const eventosAno = eventosMes * meses;
    const faturamentoCents = eventosAno * ticket;
    const custosCents = fixo * meses + porEvento * eventosAno + manutencaoPeriodo;
    const lucroCents = faturamentoCents - custosCents;
    return {
      eventosMes,
      eventosAno,
      faturamentoCents,
      custosCents,
      lucroCents,
      lucroMesCents: Math.round(lucroCents / meses),
      margemPct: faturamentoCents > 0 ? Math.round((lucroCents / faturamentoCents) * 100) : null,
    };
  });

  const margemPorEvento = ticket - porEvento;
  const custoMensalSemEvento = fixo + manutencaoPeriodo / meses;
  const equilibrioEventosMes = margemPorEvento > 0 ? Math.ceil(custoMensalSemEvento / margemPorEvento) : null;

  const avisos: string[] = [];
  if (!ticket) avisos.push("Sem valor por evento: o faturamento saiu zero.");
  if (margemPorEvento <= 0 && ticket) avisos.push("O custo por evento é igual ou maior que o valor cobrado.");
  const acima = cenariosIn.filter((n) => n > FINS_DE_SEMANA_POR_MES);
  if (acima.length) {
    avisos.push(`Com um carro só, mais de ${FINS_DE_SEMANA_POR_MES} eventos por mês exige eventos em dias de semana (${acima.join(", ")}).`);
  }
  return { meses, cenarios, equilibrioEventosMes, avisos };
}
