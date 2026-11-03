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
