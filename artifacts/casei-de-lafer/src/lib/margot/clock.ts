// Relógio da Margot: data e hora vêm do servidor (America/Sao_Paulo), nunca do modelo.
// Puro e testado em clock.test.ts. Usado por runAgent (carimbo na última fala da pessoa)
// e pelas ferramentas verificar_data (dia da semana e dias que faltam, calculados em código).

import { diffDays, formatDateBR, isDateString, TIMEZONE, todayISO } from "../gestor/rules.ts";

/** Dia da semana por extenso, em português, de uma data AAAA-MM-DD ("quarta-feira"). Não depende do fuso do servidor. */
export function weekdayOf(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

/** "[Agora: quarta-feira, 28/10/2026, 14:35 (horário de Brasília)]" */
export function nowStamp(now: Date = new Date()): string {
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: TIMEZONE }).format(now);
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  return `[Agora: ${weekday}, ${formatDateBR(todayISO(now))}, ${time} (horário de Brasília)]`;
}

/** Fatos de calendário de uma data, calculados aqui para o modelo não precisar fazer a conta. */
export function dateFacts(date: string, now: Date = new Date()): { dia_da_semana: string; dias_ate_a_data: number; quando: string } | null {
  if (!isDateString(date)) return null;
  const dias = diffDays(todayISO(now), date);
  const quando =
    dias === 0 ? "hoje" : dias === 1 ? "amanhã" : dias === -1 ? "ontem" : dias > 1 ? `daqui a ${dias} dias` : `há ${-dias} dias`;
  return { dia_da_semana: weekdayOf(date), dias_ate_a_data: dias, quando };
}

type Turn = { role: string; content: unknown };

/**
 * Põe o carimbo de data e hora no começo da última fala da PESSOA (não dos resultados de ferramentas).
 * Devolve uma cópia; não altera as mensagens recebidas. Sem fala da pessoa, devolve as mesmas mensagens.
 */
export function stampLastUserTurn<T extends Turn>(messages: T[], now: Date = new Date()): T[] {
  const stamp = nowStamp(now);
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const c = m.content;
    let content: unknown;
    if (typeof c === "string") {
      content = `${stamp}\n${c}`;
    } else if (Array.isArray(c) && !c.some((b) => b && typeof b === "object" && (b as { type?: string }).type === "tool_result")) {
      content = [{ type: "text", text: stamp }, ...c];
    } else {
      continue; // turno de resultados de ferramentas: segue procurando a fala da pessoa mais atrás
    }
    const out = messages.slice();
    out[i] = { ...m, content };
    return out;
  }
  return messages;
}
