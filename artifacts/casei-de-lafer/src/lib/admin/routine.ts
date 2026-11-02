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
