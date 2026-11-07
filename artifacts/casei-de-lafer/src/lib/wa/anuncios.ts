// Quantas conversas, pedidos e fechamentos cada anúncio de clique para o WhatsApp trouxe. Puro, sem banco: testado em
// anuncios.test.ts. Quem busca os dados é secretary.ts (ferramenta anuncios_origem). O custo de cada anúncio vem do
// gerenciador de anúncios da Meta; com os dois lados dá para calcular quanto custou cada conversa e cada casamento fechado.

export interface ConversaDeAnuncio {
  /** Id do anúncio que a Meta mandou na primeira mensagem (vazio quando só veio o código do clique). */
  adSourceId: string;
  adHeadline: string;
  /** Status do pedido da conversa; null quando não virou pedido. */
  orderStatus: string | null;
}

export interface ResumoAnuncio {
  id: string;
  titulo: string;
  conversas: number;
  /** Conversas que viraram pedido ainda vivo (nem perdido nem cancelado). */
  pedidos: number;
  /** Pedidos com a data garantida (confirmado) ou já realizados. */
  fechados: number;
}

const MORTOS = ["perdido", "cancelado"];
const FECHADOS = ["confirmado", "realizado"];

export function resumirAnuncios(conversas: ConversaDeAnuncio[]): ResumoAnuncio[] {
  const por = new Map<string, ResumoAnuncio>();
  for (const c of conversas) {
    const id = c.adSourceId || "(sem código do anúncio)";
    const r = por.get(id) ?? { id, titulo: "", conversas: 0, pedidos: 0, fechados: 0 };
    r.conversas += 1;
    if (!r.titulo && c.adHeadline) r.titulo = c.adHeadline;
    if (c.orderStatus && !MORTOS.includes(c.orderStatus)) r.pedidos += 1;
    if (c.orderStatus && FECHADOS.includes(c.orderStatus)) r.fechados += 1;
    por.set(id, r);
  }
  return [...por.values()].sort((a, b) => b.fechados - a.fechados || b.pedidos - a.pedidos || b.conversas - a.conversas || a.id.localeCompare(b.id));
}
