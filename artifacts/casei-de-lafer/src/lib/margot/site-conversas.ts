// Conversas do chat do site: regras puras (sem banco). O banco fica em site-conversas-service.ts.
// O texto é guardado por 6 meses, para a equipe conferir e dar continuidade; depois a rotina diária apaga.

export const GUARDA_MESES = 6;
const DIA = 86_400_000;
/** 6 meses, contados por baixo (183 dias), para nunca guardar além do prometido na política de privacidade. */
export const GUARDA_DIAS = 183;

/** Data a partir da qual uma fala ainda pode ficar guardada; o que for mais antigo é apagado. */
export function limiteDeGuarda(agora: Date): Date {
  return new Date(agora.getTime() - GUARDA_DIAS * DIA);
}

const ID_VALIDO = /^[A-Za-z0-9._-]{8,80}$/;

/** O código da conversa vem do navegador: só aceita um formato curto e simples. Fora disso, não guarda. */
export function idDeConversa(valor: unknown): string | null {
  return typeof valor === "string" && ID_VALIDO.test(valor) ? valor : null;
}

const TEXTO_MAXIMO = 4000;

/** Uma fala como vai para o banco: sem espaços sobrando e com tamanho limitado. Vazia = não guarda. */
export function textoParaGuardar(texto: unknown): string {
  return typeof texto === "string" ? texto.trim().slice(0, TEXTO_MAXIMO) : "";
}

export interface Fala {
  conversationId: string;
  role: string;
  content: string;
  orderId: number | null;
  createdAt: Date;
}

export interface ResumoDaConversa {
  id: string;
  inicio: string;
  ultima: string;
  falas: number;
  /** Primeira coisa que o cliente escreveu, para reconhecer a conversa na lista. */
  abertura: string;
  /** Pedido que a Margot criou nesta conversa, se criou. */
  pedido: number | null;
}

const ABERTURA_MAXIMA = 140;

/** Junta as falas por conversa, da conversa mais recente para a mais antiga. */
export function resumir(falas: readonly Fala[]): ResumoDaConversa[] {
  const grupos = new Map<string, Fala[]>();
  for (const f of falas) grupos.set(f.conversationId, [...(grupos.get(f.conversationId) ?? []), f]);
  return [...grupos.entries()]
    .map(([id, lista]) => {
      const ordem = [...lista].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const primeira = ordem.find((f) => f.role === "cliente");
      const comPedido = [...ordem].reverse().find((f) => f.orderId !== null);
      const texto = primeira?.content.replace(/\s+/g, " ") ?? "";
      return {
        id,
        inicio: ordem[0]!.createdAt.toISOString(),
        ultima: ordem[ordem.length - 1]!.createdAt.toISOString(),
        falas: ordem.length,
        abertura: texto.length > ABERTURA_MAXIMA ? `${texto.slice(0, ABERTURA_MAXIMA - 1)}…` : texto,
        pedido: comPedido?.orderId ?? null,
      };
    })
    .sort((a, b) => b.ultima.localeCompare(a.ultima));
}
