// Monta o histórico que vai para o Claude a partir das mensagens guardadas. Puro: testado em wa.test.ts.

export interface StoredMessage {
  id: number;
  direction: string; // in | out
  author: string; // cliente | margot | leonardo | sistema
  type: string;
  text: string;
  fileName: string;
  status: string;
}

export interface TextTurn {
  role: "user" | "assistant";
  content: string;
}

const LABELS: Record<string, string> = {
  image: "imagem",
  video: "vídeo",
  document: "documento",
  sticker: "figurinha",
  location: "localização",
  contacts: "contato",
};

/** Texto legível de uma mensagem guardada, do jeito que o modelo deve ler. */
export function describe(m: StoredMessage): string {
  const text = (m.text ?? "").trim();
  switch (m.type) {
    case "text":
    case "interactive":
    case "button":
    case "template":
      return text;
    case "audio":
      return text ? `[áudio] ${text}` : "[áudio que não consegui ouvir]";
    case "document":
      return `[documento${m.fileName ? `: ${m.fileName}` : ""}]${text ? ` ${text}` : ""}`;
    case "reaction":
      return "";
    default: {
      const label = LABELS[m.type];
      if (!label) return text;
      return `[${label}]${text ? ` ${text}` : ""}`;
    }
  }
}

/** Mensagens que nunca entram no histórico: falhas, rascunhos e avisos ainda na fila. */
function visible(m: StoredMessage): boolean {
  if (m.direction === "out" && ["falhou", "pendente", "rascunho"].includes(m.status)) return false;
  return true;
}

/**
 * Converte a conversa em turnos alternados (exigência da API): começa pela pessoa,
 * junta mensagens seguidas do mesmo lado e marca o que a equipe escreveu pessoalmente.
 */
export function buildHistory(rows: StoredMessage[], opts: { maxTurns?: number; maxChars?: number } = {}): TextTurn[] {
  const maxTurns = opts.maxTurns ?? 30;
  const maxChars = opts.maxChars ?? 12_000;
  const turns: TextTurn[] = [];

  for (const m of rows) {
    if (!visible(m)) continue;
    let content = describe(m);
    if (!content) continue;
    const role: TextTurn["role"] = m.direction === "in" ? "user" : "assistant";
    if (role === "assistant" && m.author === "leonardo") content = `[A equipe escreveu pessoalmente] ${content}`;
    if (role === "assistant" && m.author === "sistema") content = `[mensagem automática] ${content}`;
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n${content}`;
    else turns.push({ role, content });
  }

  // Mantém só o final da conversa, sem passar do limite de caracteres.
  let kept = turns.slice(-maxTurns);
  while (kept.length > 1 && kept.reduce((n, t) => n + t.content.length, 0) > maxChars) kept = kept.slice(1);
  while (kept.length && kept[0].role !== "user") kept = kept.slice(1);
  return kept;
}

/**
 * Ordem da conversa para responder: tudo o que já foi tratado (inclusive respostas da Margot enviadas
 * depois que a mensagem nova chegou) e, por último, as mensagens que esta resposta vai atender.
 *
 * Sem isso, quem manda foto e texto em seguida recebia duas respostas que se contradiziam:
 * a segunda não via a primeira, porque ela foi gravada com id maior que o do texto.
 */
export function replyOrder<T extends { id: number }>(rows: T[], answering: number[]): T[] {
  const ids = new Set(answering);
  const byId = (a: T, b: T) => a.id - b.id;
  return [...rows.filter((r) => !ids.has(r.id)).sort(byId), ...rows.filter((r) => ids.has(r.id)).sort(byId)];
}

/** Ids das mídias (foto/PDF) que o dono mandou há pouco e que a resposta atual pode precisar ver de novo. */
export function recentInbound<T extends { id: number; direction: string; createdAt: Date }>(
  rows: T[],
  answering: number[],
  now: Date,
  windowMs = 5 * 60_000,
): T[] {
  const ids = new Set(answering);
  return rows.filter((r) => r.direction === "in" && !ids.has(r.id) && now.getTime() - r.createdAt.getTime() <= windowMs);
}
