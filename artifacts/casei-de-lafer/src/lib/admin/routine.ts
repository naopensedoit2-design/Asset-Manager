// Registro da rotina diária das 7h (Vercel cron → /api/cron/diario). Fica numa linha da tabela Setting,
// para a tela de Conexões mostrar "rodou hoje às 7h" em vez de ninguém saber se rodou. Regra pura.

export const ROUTINE_KEY = "rotinaDiariaUltima";
/** Última chamada da Vercel à rotina que foi recusada (senha que não confere, CRON_SECRET vazio). Linha à parte,
 * para uma chamada de fora não apagar o registro da última execução boa. */
export const ROUTINE_REJECT_KEY = "rotinaDiariaRecusa";

export interface RoutineReject {
  at: string;
  motivo: string;
}

/**
 * Confere o cabeçalho Authorization da chamada do cron contra o CRON_SECRET.
 * Os dois lados são aparados: um espaço ou quebra de linha colado junto do valor na Vercel
 * fazia toda chamada ser recusada sem deixar rastro (o recebido já era aparado, o esperado não).
 */
export function cronAuth(header: string | null | undefined, secret: string | null | undefined): { ok: true } | { ok: false; motivo: string; status: number } {
  const expected = (secret ?? "").trim();
  if (!expected) return { ok: false, motivo: "CRON_SECRET vazio na Vercel", status: 503 };
  const h = (header ?? "").trim();
  if (!h) return { ok: false, motivo: "a chamada veio sem senha (cabeçalho Authorization)", status: 401 };
  if (!/^Bearer\s+/i.test(h)) return { ok: false, motivo: "a senha veio num formato diferente de \"Bearer …\"", status: 401 };
  const got = h.replace(/^Bearer\s+/i, "").trim();
  if (got !== expected) return { ok: false, motivo: "a senha da chamada não confere com o CRON_SECRET", status: 401 };
  return { ok: true };
}

export function parseReject(raw: string | null | undefined): RoutineReject | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (typeof v?.at !== "string" || Number.isNaN(Date.parse(v.at)) || typeof v?.motivo !== "string") return null;
    return { at: v.at, motivo: v.motivo };
  } catch {
    return null;
  }
}

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
export function describeRoutine(record: RoutineRecord | null, now: Date, cronSecret = true, recusa: RoutineReject | null = null): string {
  const agenda = "A rotina diária roda todo dia entre 7h e 8h (horário de Brasília; a Vercel do plano grátis escolhe o minuto) e manda o resumo do dia no WhatsApp do Leonardo.";
  if (!cronSecret) return `${agenda} ⚠️ Ela está desligada: falta a variável CRON_SECRET na Vercel.`;
  // Recusa mais nova que a última execução boa: a Vercel chamou, mas a rotina não rodou.
  const recusaNova = recusa && (!record || Date.parse(recusa.at) > Date.parse(record.at));
  const aviso = recusaNova
    ? ` ⚠️ Em ${dia(new Date(recusa.at))} às ${hora(new Date(recusa.at))} a Vercel chamou a rotina, mas a chamada foi recusada (${recusa.motivo}). Confira o CRON_SECRET de Production na Vercel e faça um novo deploy.`
    : "";
  if (!record) return `${agenda} Não há registro de nenhuma execução: ou ela nunca rodou, ou o registro foi apagado.${aviso || " Se continuar assim, a Vercel nem está chamando a rotina: confira em Settings → Cron Jobs."}`;
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
  return `${agenda} Última execução: ${quando}; ${resultado}.${aviso || (atrasada ? " ⚠️ Faz mais de um dia que ela não roda: algo está errado com o agendamento na Vercel." : "")}`;
}
