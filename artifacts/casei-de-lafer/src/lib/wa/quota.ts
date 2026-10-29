// Quanto da cota grátis de mensagens do mês o número da Margot já usou. Puro, sem imports.
//
// Regra da Meta (página oficial de preços, consulta de 28/10/2026): 1.000 mensagens de serviço grátis por
// mês por número; da 1.001ª em diante há cobrança, e sem forma de pagamento cadastrada o excedente não é
// entregue. Mensagem de serviço = a que a empresa manda dentro da janela de 24h da pessoa (texto livre,
// botões, mídia). Mensagem modelo (template) é cobrada por mensagem. Cada resposta da Margot conta, a
// clientes e ao Leonardo. O fuso do "mês" da Meta não está na página: usamos o de Brasília [ESTIMATIVA].

export const FREE_SERVICE_MESSAGES = 1000;
/** Primeiro aviso: 70% da cota. Segundo, mais forte: 90%. */
export const WARN_AT = 0.7;
export const ALERT_AT = 0.9;

export type QuotaLevel = "ok" | "atencao" | "perto" | "estourou";

export interface MonthCounts {
  /** Mensagens livres (não modelo) enviadas com sucesso no mês. */
  service: number;
  /** Modelos enviados com sucesso no mês (cada um é cobrado). */
  templates: number;
}

/** Meia-noite do dia 1º do mês, em Brasília (UTC−3, sem horário de verão), como instante UTC. `todayIso` = AAAA-MM-DD. */
export function monthStart(todayIso: string): Date {
  return new Date(`${todayIso.slice(0, 7)}-01T03:00:00.000Z`);
}

const clean = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** Soma as contagens por tipo de mensagem em "livres" e "modelos". */
export function countByKind(rows: { type: string; n: number }[]): MonthCounts {
  const out: MonthCounts = { service: 0, templates: 0 };
  for (const r of rows) {
    if (r.type === "template") out.templates += clean(r.n);
    else out.service += clean(r.n);
  }
  return out;
}

export function quotaLevel(service: number, limit = FREE_SERVICE_MESSAGES): QuotaLevel {
  const used = clean(service);
  if (used >= limit) return "estourou";
  if (used >= limit * ALERT_AT) return "perto";
  if (used >= limit * WARN_AT) return "atencao";
  return "ok";
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

export interface QuotaReport {
  level: QuotaLevel;
  /** Linhas para o resumo das 7h (vazio enquanto está tudo bem: não enche o resumo de número). */
  lines: string[];
  /** Trecho curto para a linha-resumo do aviso modelo ("" quando está tudo bem). */
  part: string;
}

export function quotaReport(counts: MonthCounts, limit = FREE_SERVICE_MESSAGES): QuotaReport {
  const used = clean(counts.service);
  const level = quotaLevel(used, limit);
  if (level === "ok") return { level, lines: [], part: "" };

  const pct = Math.floor((used / limit) * 100);
  const head = `*WhatsApp no mês:* ${fmt(used)} de ${fmt(limit)} mensagens grátis (${pct}%).`;
  const lines: string[] = [];
  let part: string;
  if (level === "atencao") {
    lines.push(`⚠️ ${head}`, "Sem forma de pagamento na Meta, o que passar de 1.000 não é entregue. Confira se ela está cadastrada.");
    part = `WhatsApp em ${pct}% da cota do mês`;
  } else if (level === "perto") {
    lines.push(
      `🚨 ${head}`,
      "Cadastre a forma de pagamento na Meta antes de passar de 1.000: depois disso a mensagem é cobrada e, sem cartão, não é entregue.",
    );
    part = `WhatsApp em ${pct}% da cota do mês, falta pouco`;
  } else {
    lines.push(
      `🚨 *WhatsApp no mês:* ${fmt(used)} mensagens, acima das ${fmt(limit)} grátis.`,
      "Cada mensagem a mais é cobrada; sem forma de pagamento na Meta, não é entregue.",
    );
    part = "WhatsApp acima da cota grátis do mês";
  }
  const templates = clean(counts.templates);
  if (templates > 0) lines.push(`Modelos enviados no mês: ${fmt(templates)} (cada um é cobrado).`);
  return { level, lines, part };
}
