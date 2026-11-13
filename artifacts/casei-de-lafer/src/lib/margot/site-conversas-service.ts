// Conversas do chat do site no banco. Regras puras em site-conversas.ts.

import { prisma } from "@/lib/prisma";
import { limiteDeGuarda, resumir, textoParaGuardar, type ResumoDaConversa } from "./site-conversas.ts";

/** Guarda a última pergunta do cliente e a resposta da Margot. Nunca derruba o chat: quem chama ignora o erro. */
export async function guardarTroca(conversationId: string, pergunta: string, resposta: string, orderId: number | null) {
  const agora = Date.now();
  const linhas = [
    { conversationId, role: "cliente", content: textoParaGuardar(pergunta), orderId: null, createdAt: new Date(agora) },
    // um milissegundo depois, para a ordem da conversa nunca empatar
    { conversationId, role: "margot", content: textoParaGuardar(resposta), orderId, createdAt: new Date(agora + 1) },
  ].filter((l) => l.content);
  if (linhas.length) await prisma.siteChatMessage.createMany({ data: linhas });
}

/** Apaga o que passou de 6 meses. Roda na rotina diária. */
export async function apagarConversasAntigas(agora = new Date()): Promise<number> {
  const { count } = await prisma.siteChatMessage.deleteMany({ where: { createdAt: { lt: limiteDeGuarda(agora) } } });
  return count;
}

const LISTA_MAXIMA = 2000;

/** Conversas para a lista do painel (as falas mais recentes, agrupadas). */
export async function listarConversas(): Promise<ResumoDaConversa[]> {
  const falas = await prisma.siteChatMessage.findMany({ orderBy: { createdAt: "desc" }, take: LISTA_MAXIMA });
  return resumir(falas);
}

/** Todas as falas de uma conversa, na ordem. */
export async function lerConversa(conversationId: string) {
  const falas = await prisma.siteChatMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  return falas.map((f) => ({ papel: f.role, texto: f.content, em: f.createdAt.toISOString(), pedido: f.orderId }));
}
