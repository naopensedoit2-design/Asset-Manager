// Recados do Leonardo sobre uma cliente que ainda vai chamar ("a Fulana vai te chamar, dá 5% de desconto").
// Ficam na tabela Setting (chave `margotRecado:<id>`, sem mudar o schema). São só anotações:
// a Margot do atendimento nunca aplica desconto sozinha. Quando o pedido da cliente aparece,
// o Leonardo é avisado com o recado e a secretária propõe o ajuste no botão Confirmar.

export const RECADO_PREFIX = "margotRecado:";
/** Recado esquecido não fica valendo para sempre. */
export const RECADO_DIAS = 180;
export const RECADO_MAX = 30;

export interface Recado {
  id: string;
  /** Nome da cliente como o Leonardo disse. */
  cliente: string;
  texto: string;
  /** AAAA-MM-DD */
  criadoEm: string;
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const palavras = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((p) => p.length >= 2);

export function recadoKey(id: string): string {
  return `${RECADO_PREFIX}${id}`;
}

export function novoRecado(cliente: string, texto: string, hoje: string, id: string): Recado | string {
  const c = cliente.trim().replace(/\s+/g, " ").slice(0, 80);
  const t = texto.trim().replace(/\s+/g, " ").slice(0, 400);
  if (!palavras(c).length) return "Falta o nome da cliente.";
  if (!t) return "Falta o recado (o que fazer quando ela chamar).";
  return { id, cliente: c, texto: t, criadoEm: hoje };
}

export function lerRecado(key: string, value: string): Recado | null {
  if (!key.startsWith(RECADO_PREFIX)) return null;
  try {
    const v = JSON.parse(value);
    if (typeof v?.cliente !== "string" || typeof v?.texto !== "string" || typeof v?.criadoEm !== "string") return null;
    return { id: key.slice(RECADO_PREFIX.length), cliente: v.cliente, texto: v.texto, criadoEm: v.criadoEm };
  } catch {
    return null;
  }
}

export function gravarRecado(r: Recado): { key: string; value: string } {
  return { key: recadoKey(r.id), value: JSON.stringify({ cliente: r.cliente, texto: r.texto, criadoEm: r.criadoEm }) };
}

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** Recados ainda valendo, do mais novo para o mais antigo. */
export function recadosValendo(rows: { key: string; value: string }[], hoje: string): Recado[] {
  return rows
    .map((r) => lerRecado(r.key, r.value))
    .filter((r): r is Recado => !!r && diasEntre(r.criadoEm, hoje) <= RECADO_DIAS)
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : a.criadoEm > b.criadoEm ? -1 : 0));
}

/**
 * Recados que combinam com o nome de uma cliente: toda palavra do nome do recado aparece no nome
 * dela, sem acento e sem diferença de maiúscula ("Neusa" combina com "Neusa Souza", não com "Neusalina").
 */
export function recadosDe(recados: Recado[], nome: string): Recado[] {
  const doNome = new Set(palavras(nome));
  if (!doNome.size) return [];
  return recados.filter((r) => {
    const p = palavras(r.cliente);
    return p.length > 0 && p.every((x) => doNome.has(x));
  });
}

/** Uma linha por recado, para o aviso ao Leonardo e para o contexto da secretária. */
export function descreverRecados(recados: Recado[]): string {
  return recados.map((r) => `• ${r.cliente}: ${r.texto} (código ${r.id})`).join("\n");
}
