// Pendências da Margot: pedidos de melhoria que o Leonardo dita no WhatsApp ("anota pro Claude: ...").
// A Margot só anota; quem lê e transforma em PR é a rotina da manhã do Claude, e quem mescla é o Leonardo.
// Ficam na tabela Setting (chave `margotPendencia:<número>`, sem mudar o schema).

export const PENDENCIA_PREFIX = "margotPendencia:";
export const PENDENCIA_MAX_ABERTAS = 40;
/** Pendência concluída some da lista depois deste prazo. */
export const PENDENCIA_DIAS_CONCLUIDA = 30;

export interface Pendencia {
  numero: number;
  texto: string;
  /** AAAA-MM-DD */
  criadaEm: string;
  status: "aberta" | "concluida";
  concluidaEm: string | null;
  /** Nota de quem concluiu (ex.: "PR nº 40"). */
  nota: string;
}

export function pendenciaKey(numero: number): string {
  return `${PENDENCIA_PREFIX}${numero}`;
}

export function lerPendencia(key: string, value: string): Pendencia | null {
  if (!key.startsWith(PENDENCIA_PREFIX)) return null;
  const numero = Number(key.slice(PENDENCIA_PREFIX.length));
  if (!Number.isInteger(numero) || numero <= 0) return null;
  try {
    const v = JSON.parse(value);
    if (typeof v?.texto !== "string" || typeof v?.criadaEm !== "string") return null;
    return {
      numero,
      texto: v.texto,
      criadaEm: v.criadaEm,
      status: v.status === "concluida" ? "concluida" : "aberta",
      concluidaEm: typeof v.concluidaEm === "string" ? v.concluidaEm : null,
      nota: typeof v.nota === "string" ? v.nota : "",
    };
  } catch {
    return null;
  }
}

export function gravarPendencia(p: Pendencia): { key: string; value: string } {
  return {
    key: pendenciaKey(p.numero),
    value: JSON.stringify({ texto: p.texto, criadaEm: p.criadaEm, status: p.status, concluidaEm: p.concluidaEm, nota: p.nota }),
  };
}

/** Número seguinte ao maior já usado (inclui concluídas, para não repetir número). */
export function proximoNumero(existentes: Pendencia[]): number {
  return existentes.reduce((m, p) => Math.max(m, p.numero), 0) + 1;
}

export function novaPendencia(texto: string, hoje: string, existentes: Pendencia[]): Pendencia | string {
  const t = texto.trim().replace(/\s+/g, " ").slice(0, 800);
  if (t.length < 5) return "Falta dizer o que precisa mudar.";
  if (existentes.filter((p) => p.status === "aberta").length >= PENDENCIA_MAX_ABERTAS) {
    return `Já há ${PENDENCIA_MAX_ABERTAS} pendências abertas. Conclua alguma antes.`;
  }
  return { numero: proximoNumero(existentes), texto: t, criadaEm: hoje, status: "aberta", concluidaEm: null, nota: "" };
}

export function concluir(p: Pendencia, hoje: string, nota: string): Pendencia {
  return { ...p, status: "concluida", concluidaEm: hoje, nota: nota.trim().slice(0, 200) };
}

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** Abertas (mais antigas primeiro) e concluídas recentes; o resto fica de fora. */
export function pendenciasVisiveis(rows: { key: string; value: string }[], hoje: string): Pendencia[] {
  return rows
    .map((r) => lerPendencia(r.key, r.value))
    .filter((p): p is Pendencia => !!p)
    .filter((p) => p.status === "aberta" || (p.concluidaEm !== null && diasEntre(p.concluidaEm, hoje) <= PENDENCIA_DIAS_CONCLUIDA))
    .sort((a, b) => (a.status === b.status ? a.numero - b.numero : a.status === "aberta" ? -1 : 1));
}
