// Quando um pedido pode ser EXCLUÍDO (apagado de vez). Puro: testado em exclusao.test.ts.
//
// Excluir leva junto orçamentos, reservas, pagamentos e histórico do pedido. Pagamento já RECEBIDO conta no Financeiro,
// e apagar sem cuidado faria sumir dinheiro que entrou de verdade. Por isso:
//  - sem pagamento recebido: pode excluir (ex.: pedido criado por engano);
//  - com pagamento recebido: só se for DUPLICADO comprovado, isto é, existir outro pedido ativo do mesmo cliente e da
//    mesma data que já tenha cada um desses pagamentos (mesmo valor e mesmo dia). O dinheiro continua contado uma vez.
// Qualquer outro caso fica de fora: casamento que não vai acontecer se cancela, não se exclui.

import { formatBRL } from "./rules.ts";

export interface PagamentoDaRegra {
  amountCents: number;
  status: string;
  /** Dia do recebimento (AAAA-MM-DD), como o Financeiro conta. */
  paidAt: string | null;
}

export interface PedidoDaRegra {
  id: number;
  clientId: number;
  status: string;
  /** AAAA-MM-DD */
  eventDate: string | null;
  payments: PagamentoDaRegra[];
}

export type Exclusao =
  | { pode: true; duplicadoDe: number | null; recebidoCents: number; recebidos: number }
  | { pode: false; motivo: string; recebidoCents: number; recebidos: number };

const INATIVOS = ["cancelado", "perdido"];

/** Outro pedido ativo do mesmo cliente para o mesmo dia. */
function mesmoEvento(outro: PedidoDaRegra, pedido: PedidoDaRegra): boolean {
  return (
    outro.id !== pedido.id &&
    outro.clientId === pedido.clientId &&
    pedido.eventDate !== null &&
    outro.eventDate === pedido.eventDate &&
    !INATIVOS.includes(outro.status)
  );
}

/** O outro pedido já tem cada pagamento recebido de `recebidos` (cada um conta uma vez só). */
function cobre(outro: PedidoDaRegra, recebidos: PagamentoDaRegra[]): boolean {
  const livres = outro.payments.filter((p) => p.status === "recebido");
  for (const r of recebidos) {
    const i = livres.findIndex((p) => p.amountCents === r.amountCents && p.paidAt === r.paidAt);
    if (i === -1) return false;
    livres.splice(i, 1);
  }
  return true;
}

export function avaliarExclusao(pedido: PedidoDaRegra, outros: PedidoDaRegra[]): Exclusao {
  const recebidos = pedido.payments.filter((p) => p.status === "recebido");
  const recebidoCents = recebidos.reduce((soma, p) => soma + p.amountCents, 0);
  const iguais = outros.filter((o) => mesmoEvento(o, pedido));

  if (!recebidos.length) return { pode: true, duplicadoDe: iguais[0]?.id ?? null, recebidoCents: 0, recebidos: 0 };

  const gemeo = iguais.find((o) => cobre(o, recebidos));
  if (gemeo) return { pode: true, duplicadoDe: gemeo.id, recebidoCents, recebidos: recebidos.length };

  return {
    pode: false,
    recebidoCents,
    recebidos: recebidos.length,
    motivo:
      `O pedido #${pedido.id} tem ${formatBRL(recebidoCents)} já recebidos (${recebidos.length} pagamento${recebidos.length > 1 ? "s" : ""}) ` +
      "e não existe outro pedido do mesmo cliente e da mesma data com esses mesmos pagamentos. " +
      "Excluir faria esse dinheiro sumir do Financeiro, então só excluo duplicado comprovado. " +
      "Se o casamento não vai acontecer, o certo é cancelar.",
  };
}
