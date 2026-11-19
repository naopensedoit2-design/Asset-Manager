// Registro da rotina diária das 7h (Vercel cron → /api/cron/diario). Fica numa linha da tabela Setting,
// para a tela de Conexões mostrar "rodou hoje às 7h" em vez de ninguém saber se rodou. Regra pura.

export const ROUTINE_KEY = "rotinaDiariaUltima";

export interface RoutineRecord {
  /** Quando a rotina terminou (ISO). */
  at: string;
  resumoEnviado: boolean | null;
  detalhe: string | null;
}

export interface SummaryResult {
  enviado: boolean;
  motivo?: string;
  como?: string;
}

export function buildRoutineRecord(summary: SummaryResult, now: Date): RoutineRecord {
  return {
    at: now.toISOString(),
    resumoEnviado: summary.enviado,
    detalhe: summary.enviado ? (summary.como === "modelo" ? "aviso modelo (conversa fechada)" : "resumo enviado") : (summary.motivo ?? null),
  };
}

/** Lê o que foi guardado; qualquer coisa estranha vira "nunca rodou". */
export function parseRoutine(raw: string | null | undefined): RoutineRecord | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (typeof v?.at !== "string" || Number.isNaN(Date.parse(v.at))) return null;
    return {
      at: v.at,
      resumoEnviado: typeof v.resumoEnviado === "boolean" ? v.resumoEnviado : null,
      detalhe: typeof v.detalhe === "string" ? v.detalhe : null,
    };
  } catch {
    return null;
  }
}

const TZ = "America/Sao_Paulo";
const dia = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
const hora = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);

/**
 * O que a Margot diz ao dono quando ele pergunta pelo resumo do dia ("por que não recebi o relatório?").
 * Antes ela respondia que não tinha acesso à programação; agora lê o registro da última execução.
 */
export function describeRoutine(record: RoutineRecord | null, now: Date, cronSecret = true): string {
  const agenda = "A rotina diária roda todo dia entre 7h e 8h (horário de Brasília; a Vercel do plano grátis escolhe o minuto) e manda o resumo do dia no WhatsApp do Leonardo.";
  if (!cronSecret) return `${agenda} ⚠️ Ela está desligada: falta a variável CRON_SECRET na Vercel.`;
  if (!record) return `${agenda} Não há registro de nenhuma execução: ou ela nunca rodou, ou o registro foi apagado. Vale conferir em Conexões no painel.`;
  const at = new Date(record.at);
  const quando = dia(at) === dia(now) ? `hoje às ${hora(at)}` : `${dia(at)} às ${hora(at)}`;
  const resultado =
    record.resumoEnviado === true
      ? record.detalhe === "aviso modelo (conversa fechada)"
        ? "o resumo foi avisado pelo modelo de aviso (a conversa de 24 h estava fechada: ele precisa tocar no aviso para ver o texto)"
        : "o resumo foi enviado"
      : record.resumoEnviado === false
        ? `o resumo NÃO foi enviado (motivo: ${record.detalhe ?? "não registrado"})`
        : "sem informação sobre o envio";
  const atrasada = now.getTime() - at.getTime() > 26 * 3_600_000;
  return `${agenda} Última execução: ${quando}; ${resultado}.${atrasada ? " ⚠️ Faz mais de um dia que ela não roda: algo está errado com o agendamento na Vercel." : ""}`;
}
