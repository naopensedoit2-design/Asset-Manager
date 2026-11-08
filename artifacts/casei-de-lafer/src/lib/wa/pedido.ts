// Criar pedido pelo WhatsApp (modo secretária). Parte pura, sem banco: valida o que o Leonardo pediu,
// monta os itens do orçamento e o texto da confirmação. Quem grava é actions.ts, depois do botão Confirmar.

import { formatBRL, formatDateBR, isDateString } from "../gestor/rules.ts";
import { canonicalPhone, formatPhone, phoneVariants } from "./phone.ts";

export interface PedidoNovo {
  nome: string;
  /** Já no formato do cadastro (com 55 e o nono dígito). */
  telefone: string;
  data: string;
  horario: string;
  local: string;
  cidade: string;
  /** De quem é o WhatsApp: "cerimonialista" ou "outro" (a própria cliente). */
  origem?: "cerimonialista" | "outro";
  servicos: number[];
  /** Total combinado, em centavos; null = preços da tabela. */
  valorCents: number | null;
  /** Id do evento na Google Agenda, quando o pedido nasce dele. */
  evento: string | null;
  notas: string;
}

export interface ServicoLista {
  id: number;
  name: string;
  priceCents: number;
  isAddon: boolean;
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

/** WhatsApp com DDD (10 ou 11 dígitos, com ou sem 55). Devolve a forma do cadastro, ou null. */
export function telefoneDoPedido(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const digits = text.replace(/\D/g, "");
  const national = digits.startsWith("55") && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits;
  if (national.length !== 10 && national.length !== 11) return null;
  const phone = canonicalPhone(text);
  return phone && phoneVariants(text).length ? phone : null;
}

/** Acha serviços por código ou por parte do nome ("carro da noiva", "saída"). `faltou` lista o que não achou. */
export function resolverServicos(pedidos: unknown, lista: ServicoLista[]): { ids: number[]; faltou: string[] } {
  const wanted = Array.isArray(pedidos) ? pedidos : pedidos === undefined || pedidos === null || pedidos === "" ? [] : [pedidos];
  const ids: number[] = [];
  const faltou: string[] = [];
  for (const w of wanted) {
    const byId = typeof w === "number" ? lista.find((s) => s.id === w) : undefined;
    const key = fold(String(w));
    const byName = byId ?? lista.find((s) => fold(s.name) === key) ?? lista.find((s) => key.length >= 3 && fold(s.name).includes(key));
    if (!byName) faltou.push(String(w));
    else if (!ids.includes(byName.id)) ids.push(byName.id);
  }
  return { ids, faltou };
}

/**
 * Itens do orçamento. Sem valor combinado, usa os preços da tabela. Com valor combinado, o total fecha nele:
 * o primeiro serviço leva a diferença e os demais ficam no preço da tabela.
 */
export function itensDoOrcamento(
  ids: number[],
  lista: ServicoLista[],
  valorCents: number | null,
): { serviceId: number; name: string; priceCents: number }[] {
  const itens = ids.map((id) => {
    const s = lista.find((x) => x.id === id);
    if (!s) throw new Error(`Serviço #${id} não existe.`);
    return { serviceId: s.id, name: s.name, priceCents: s.priceCents };
  });
  if (valorCents !== null && itens.length) {
    const outros = itens.slice(1).reduce((sum, i) => sum + i.priceCents, 0);
    if (valorCents < outros) throw new Error(`O total ${formatBRL(valorCents)} é menor que os outros serviços (${formatBRL(outros)}).`);
    itens[0] = { ...itens[0], priceCents: valorCents - outros };
  }
  return itens;
}

/** Texto da confirmação: tudo o que vai ser gravado, para ele conferir antes do botão. */
export function descreverPedido(p: PedidoNovo, nomesServicos: string[], sinalPercent: number): string {
  const total = p.valorCents;
  const lines = [
    `Criar pedido: *${p.nome}*`,
    `WhatsApp: ${formatPhone(p.telefone)}${p.origem === "cerimonialista" ? " (cerimonialista)" : ""}`,
    `Data: ${formatDateBR(p.data)}${p.horario ? ` às ${p.horario}` : ""}${p.local || p.cidade ? ` · ${[p.local, p.cidade].filter(Boolean).join(", ")}` : ""}`,
    `Serviço: ${nomesServicos.length ? nomesServicos.join(" + ") : "sem orçamento ainda"}`,
  ];
  if (total !== null) {
    lines.push(`Total: ${formatBRL(total)} · sinal de ${sinalPercent}% = ${formatBRL(Math.round((total * sinalPercent) / 100))}`);
  } else if (nomesServicos.length) {
    lines.push("Valor: preços da tabela");
  }
  lines.push(p.evento ? "Ligado ao evento da Google Agenda." : "Sem ligação com a Google Agenda.");
  lines.push("Fica como *novo pedido*; a data só é reservada quando o sinal for recebido.");
  return lines.join("\n");
}

/** Lê o que veio guardado na mensagem de confirmação. Devolve null se não for um pedido válido. */
export function lerPedido(raw: unknown): PedidoNovo | null {
  const p = raw as Partial<PedidoNovo> | null;
  if (!p || typeof p !== "object") return null;
  if (typeof p.nome !== "string" || !p.nome.trim()) return null;
  if (typeof p.telefone !== "string" || !telefoneDoPedido(p.telefone)) return null;
  if (typeof p.data !== "string" || !isDateString(p.data)) return null;
  if (!Array.isArray(p.servicos) || !p.servicos.every((n) => Number.isInteger(n))) return null;
  if (p.valorCents !== null && !(Number.isInteger(p.valorCents) && (p.valorCents as number) > 0)) return null;
  if (p.evento !== null && typeof p.evento !== "string") return null;
  return {
    nome: p.nome.trim().slice(0, 120),
    telefone: p.telefone,
    data: p.data,
    horario: typeof p.horario === "string" ? p.horario.slice(0, 20) : "",
    local: typeof p.local === "string" ? p.local.slice(0, 300) : "",
    cidade: typeof p.cidade === "string" ? p.cidade.slice(0, 120) : "",
    origem: p.origem === "cerimonialista" ? "cerimonialista" : "outro",
    servicos: p.servicos as number[],
    valorCents: (p.valorCents as number | null) ?? null,
    evento: p.evento ?? null,
    notas: typeof p.notas === "string" ? p.notas.slice(0, 1500) : "",
  };
}

// ─── Ajustar o valor de um pedido (desconto) ─────────────────

/**
 * Desconto que leva o orçamento ao total pedido. `total` (o valor final combinado) tem prioridade sobre `desconto`.
 * Só dá desconto: total acima da soma dos serviços precisa mudar os serviços, no painel.
 */
export function descontoPara(subtotalCents: number, pedido: { totalCents?: number | null; descontoCents?: number | null }): number {
  const desconto =
    pedido.totalCents !== undefined && pedido.totalCents !== null ? subtotalCents - pedido.totalCents : (pedido.descontoCents ?? NaN);
  if (!Number.isInteger(desconto)) throw new Error("Diga o total final ou o valor do desconto.");
  if (desconto < 0) throw new Error(`O total pedido é maior que os serviços (${formatBRL(subtotalCents)}). Para cobrar mais, mude os serviços no painel.`);
  if (desconto > subtotalCents) throw new Error("O desconto não pode ser maior que o valor dos serviços.");
  return desconto;
}

export function descreverAjuste(o: { pedido: number; nome: string; antesCents: number; subtotalCents: number; descontoCents: number; sinalPercent: number }): string {
  const total = o.subtotalCents - o.descontoCents;
  const sinal = Math.round((total * o.sinalPercent) / 100);
  return [
    `Ajustar valor do pedido #${o.pedido} (*${o.nome}*)`,
    `Antes: ${formatBRL(o.antesCents)}`,
    `Agora: ${formatBRL(total)}${o.descontoCents ? ` (desconto de ${formatBRL(o.descontoCents)} sobre ${formatBRL(o.subtotalCents)})` : " (sem desconto)"}`,
    `Sinal ${formatBRL(sinal)} · saldo ${formatBRL(total - sinal)}`,
  ].join("\n");
}

// ─── Dados do contrato (Termo Simplificado) ──────────────────

/** Mostra só o começo e o fim do documento na confirmação ("030.***.***-48"), para não repetir o CPF inteiro no chat. */
export function documentoMascarado(doc: string): string {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
  const t = doc.trim();
  return t.length <= 4 ? "****" : `${t.slice(0, 2)}${"*".repeat(Math.max(t.length - 4, 2))}${t.slice(-2)}`;
}

export function descreverContrato(o: { pedido: number; nome: string; nomeCompleto: string; documento: string; endereco: string; email: string }): string {
  const lines = [
    `Salvar dados do contrato no pedido #${o.pedido} (*${o.nome}*)`,
    `Nome completo: ${o.nomeCompleto}`,
    `Documento: ${documentoMascarado(o.documento)}`,
    `Endereço: ${o.endereco}`,
  ];
  if (o.email) lines.push(`E-mail: ${o.email}`);
  lines.push("Esses dados vão para o Termo Simplificado.");
  return lines.join("\n");
}

// ─── Pagamentos recebidos (valor e data livres) ──────────────

export type TipoPagamento = "sinal" | "saldo" | "outro";
export interface Recebimento {
  kind: TipoPagamento;
  amountCents: number;
  /** AAAA-MM-DD em que o dinheiro entrou. */
  paidAt: string;
}

/** Valida um pagamento recebido: tipo, valor positivo e data que não é futura. */
export function lerRecebimento(raw: { tipo?: unknown; valorCents?: unknown; data?: unknown }, hoje: string): Recebimento | string {
  const kind = raw.tipo === "sinal" || raw.tipo === "saldo" ? raw.tipo : raw.tipo === undefined || raw.tipo === "outro" ? "outro" : null;
  if (!kind) return "Tipo de pagamento inválido (sinal, saldo ou outro).";
  if (!Number.isInteger(raw.valorCents) || (raw.valorCents as number) <= 0) return "Valor do pagamento inválido.";
  const paidAt = raw.data === undefined || raw.data === null || raw.data === "" ? hoje : String(raw.data);
  if (!isDateString(paidAt)) return "Data do pagamento inválida (AAAA-MM-DD).";
  if (paidAt > hoje) return "A data do pagamento não pode ser futura.";
  return { kind, amountCents: raw.valorCents as number, paidAt };
}

const TIPO_LABEL: Record<TipoPagamento, string> = { sinal: "Sinal", saldo: "Saldo", outro: "Pagamento" };

export function descreverRecebimento(pedido: number, nome: string, r: Recebimento): string {
  return `Registrar recebimento no pedido #${pedido} (*${nome}*)\n${TIPO_LABEL[r.kind]} de ${formatBRL(r.amountCents)}, recebido em ${formatDateBR(r.paidAt)}.`;
}

/** Evento antigo, registrado depois (histórico do financeiro). */
export function descreverEventoPassado(p: PedidoNovo, nomesServicos: string[], totalCents: number, pagamentos: Recebimento[]): string {
  const recebido = pagamentos.reduce((s, x) => s + x.amountCents, 0);
  const lines = [
    `Registrar evento *já realizado*: *${p.nome}*`,
    `Data: ${formatDateBR(p.data)}${p.local || p.cidade ? ` · ${[p.local, p.cidade].filter(Boolean).join(", ")}` : ""}`,
    `Serviço: ${nomesServicos.join(" + ")} · total ${formatBRL(totalCents)}`,
    ...pagamentos.map((x) => `• ${TIPO_LABEL[x.kind]} ${formatBRL(x.amountCents)} em ${formatDateBR(x.paidAt)}`),
  ];
  if (recebido !== totalCents) lines.push(`⚠️ Recebido ${formatBRL(recebido)}, diferente do total.`);
  lines.push("Fica como *realizado*, sem reservar data nem mexer na Google Agenda. Entra no Financeiro nas datas dos pagamentos.");
  return lines.join("\n");
}

// ─── Excluir pedido ──────────────────────────────────────────

/** Texto da confirmação de excluir um pedido repetido ou criado por engano. Os números vêm da regra (gestor/exclusao.ts). */
export function descreverExclusao(o: {
  pedido: number;
  nome: string;
  data: string | null;
  recebidoCents: number;
  duplicadoDe: number | null;
  motivo?: string;
}): string {
  const lines = [`Excluir de vez o pedido #${o.pedido} (*${o.nome}*${o.data ? `, ${formatDateBR(o.data)}` : ""})`];
  if (o.duplicadoDe !== null) {
    lines.push(
      o.recebidoCents
        ? `É o repetido: o pedido #${o.duplicadoDe}, do mesmo cliente e da mesma data, já tem esses ${formatBRL(o.recebidoCents)} recebidos. No Financeiro o valor continua contado uma vez.`
        : `É o repetido: o pedido #${o.duplicadoDe} é do mesmo cliente e da mesma data.`,
    );
  } else {
    lines.push("Não há pagamento recebido nele.");
  }
  if (o.motivo) lines.push(`Motivo: ${o.motivo}`);
  lines.push("Orçamentos, reservas, pagamentos e histórico deste pedido são apagados e não dá para desfazer.");
  return lines.join("\n");
}

// ─── Editar pedido ───────────────────────────────────────────

export interface Edicao {
  nome?: string;
  telefone?: string;
  data?: string;
  horario?: string;
  local?: string;
  cidade?: string;
  observacao?: string;
}

const CAMPO: Record<keyof Edicao, string> = {
  nome: "Nome",
  telefone: "WhatsApp",
  data: "Data",
  horario: "Horário",
  local: "Local",
  cidade: "Cidade",
  observacao: "Anotação",
};

/** "Antes → depois" de cada campo que muda; campos iguais ao atual somem. */
export function mudancas(atual: Record<keyof Edicao, string>, pedido: Edicao): { campos: Edicao; linhas: string[] } {
  const campos: Edicao = {};
  const linhas: string[] = [];
  for (const k of Object.keys(CAMPO) as (keyof Edicao)[]) {
    const v = pedido[k];
    if (v === undefined) continue;
    if (k === "observacao") {
      if (v.trim()) {
        campos.observacao = v.trim();
        linhas.push(`${CAMPO[k]}: ${v.trim()}`);
      }
      continue;
    }
    if (v === (atual[k] ?? "")) continue;
    campos[k] = v;
    const show = (x: string) => (k === "data" && x ? formatDateBR(x) : k === "telefone" && x ? formatPhone(x) : x || "(vazio)");
    linhas.push(`${CAMPO[k]}: ${show(atual[k] ?? "")} → ${show(v)}`);
  }
  return { campos, linhas };
}

/**
 * Erro de mudar_status quando a transição não existe. Se o pedido pode ser excluído (sem pagamento
 * ou duplicado comprovado) e o dono queria tirá-lo do caminho (cancelar/perder), aponta excluir_pedido,
 * para a Margot não dizer "não consigo, faça no painel" tendo a ferramenta.
 */
export function erroTransicao(o: {
  pedido: number;
  de: string;
  para: string;
  possiveis: string[];
  paraCancelar: boolean;
  podeExcluir: boolean;
  duplicadoDe?: number | null;
}): string {
  const base = `De "${o.de}" não dá para ir direto para "${o.para}". Possíveis: ${o.possiveis.join(", ") || "nenhum"}.`;
  if (!o.paraCancelar || !o.podeExcluir) return base;
  const porque = o.duplicadoDe ? `é duplicado comprovado do #${o.duplicadoDe}` : "não tem pagamento recebido";
  return `${base} Mas o pedido #${o.pedido} ${porque} e pode ser excluído: se ele é repetido ou foi criado por engano, chame excluir_pedido com o número ${o.pedido} agora. Não mande para o painel e não diga que não consegue excluir.`;
}
