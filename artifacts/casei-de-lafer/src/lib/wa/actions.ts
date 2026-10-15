// Ações que só acontecem depois do "sim" do Leonardo: dar baixa em pagamento (confirma a data),
// lançar despesa e mandar mensagem para cliente em nome dele. A Margot (o modelo) só PROPÕE;
// quem executa é este código, quando o Leonardo toca em Confirmar ou responde "sim".

import { prisma } from "@/lib/prisma";
import * as gestor from "@/lib/gestor/service";
import { saveExpense } from "@/lib/gestor/finance-service";
import { categoryLabel } from "@/lib/gestor/finance";
import { formatBRL, formatDateBR, RuleError } from "@/lib/gestor/rules";
import { buttonsMessage, type Header } from "./client";
import { notifyOwner } from "./notify";
import { sendText } from "./send";
import { contactForClientPhone, contactLabel, windowOpen, type WaContact } from "./store";

export type Action =
  | { tipo: "pagamento"; pedido: number; pagamento: "sinal" | "saldo" }
  | {
      tipo: "despesa";
      despesa: {
        data: string;
        descricao: string;
        categoria: string;
        fornecedor: string;
        valorCents: number;
        pago: boolean;
        vencimento: string | null;
        pedido: number | null;
      };
    }
  | { tipo: "mensagem"; contato: number; texto: string };

export function parseAction(raw: string): Action | null {
  try {
    const a = JSON.parse(raw);
    if (a?.tipo === "pagamento" && Number.isInteger(a.pedido) && (a.pagamento === "sinal" || a.pagamento === "saldo")) return a;
    if (a?.tipo === "despesa" && a.despesa && Number.isInteger(a.despesa.valorCents)) return a;
    if (a?.tipo === "mensagem" && Number.isInteger(a.contato) && typeof a.texto === "string") return a;
  } catch {
    // ignora
  }
  return null;
}

/** Propõe a ação ao Leonardo com os botões Confirmar / Cancelar. */
export async function proposeAction(action: Action, body: string, summary: string, header?: Header, media?: { id: string; mime: string }) {
  return notifyOwner({
    text: `${body}\n\nConfirma? (toque no botão ou responda *sim*)`,
    summary,
    kind: "confirmacao",
    action: JSON.stringify(action),
    mediaId: media?.id,
    mediaMime: media?.mime,
    build: (rowId) =>
      buttonsMessage(
        `${body}\n\nConfirma?`,
        [
          { id: `ok:${rowId}`, title: "✅ Confirmar" },
          { id: `no:${rowId}`, title: "Cancelar" },
        ],
        header,
      ),
  });
}

/** Executa ou cancela a ação guardada na mensagem rowId. Devolve o texto para o Leonardo. */
export async function resolveAction(owner: WaContact, rowId: number, confirm: boolean): Promise<string> {
  const row = await prisma.waMessage.findUnique({ where: { id: rowId } });
  if (!row || row.contactId !== owner.id || !row.action) return "Não encontrei essa confirmação.";
  if (row.actionDoneAt) return "Isso já tinha sido resolvido. 👍";
  if (row.createdAt < new Date(Date.now() - 3 * 86_400_000)) return "Essa confirmação expirou. Me peça de novo, por favor.";
  const action = parseAction(row.action);
  if (!action) return "Não entendi essa confirmação. Faça pelo painel, por favor.";

  // Marca antes de executar: dois toques rápidos não executam duas vezes.
  const claimed = await prisma.waMessage.updateMany({ where: { id: rowId, actionDoneAt: null }, data: { actionDoneAt: new Date() } });
  if (claimed.count === 0) return "Isso já tinha sido resolvido. 👍";
  if (!confirm) return "Ok, cancelei. Nada foi alterado.";

  try {
    if (action.tipo === "pagamento") return await confirmPayment(action.pedido, action.pagamento);
    if (action.tipo === "despesa") return await createExpense(action.despesa);
    return await messageClient(action.contato, action.texto);
  } catch (e) {
    // Deixa tentar de novo se falhou.
    await prisma.waMessage.update({ where: { id: rowId }, data: { actionDoneAt: null } });
    if (e instanceof RuleError) return `Não deu certo: ${e.message}`;
    console.error("[whatsapp] ação do Leonardo", e);
    return "Deu um erro ao fazer isso. Tente pelo painel, por favor.";
  }
}

// ─── Execução ────────────────────────────────────────────────

async function confirmPayment(orderId: number, kind: "sinal" | "saldo"): Promise<string> {
  let order = await gestor.getOrder(orderId);
  const open = (o: typeof order) => o.payments.find((p) => p.kind === kind && (p.status === "a_receber" || p.status === "atrasado"));
  let payment = open(order);
  if (!payment && kind === "sinal" && !["reservado", "confirmado", "realizado"].includes(order.status)) {
    // Ainda não estava reservado: reservar cria o sinal e o saldo a partir do orçamento.
    if (!order.quotes.length) throw new RuleError("sem_orcamento", `O pedido #${orderId} ainda não tem orçamento. Registre no painel.`);
    order = await gestor.changeStatus(orderId, "reservado", "admin", "Reserva pelo WhatsApp (sinal recebido)");
    payment = open(order);
  }
  if (!payment) {
    const done = order.payments.find((p) => p.kind === kind && p.status === "recebido");
    if (done) return `O ${kind} do pedido #${orderId} já estava como recebido.`;
    throw new RuleError("sem_pagamento", `Não achei ${kind === "sinal" ? "o sinal" : "o saldo"} em aberto no pedido #${orderId}.`);
  }

  const result = await gestor.updatePayment(payment.id, { status: "recebido" }, "admin");
  const name = result.client.name;
  const date = result.eventDate ? formatDateBR(result.eventDate) : "a data";
  const lines = [`✅ ${kind === "sinal" ? "Sinal" : "Saldo"} de ${formatBRL(payment.amountCents)} recebido (${name}, pedido #${orderId}).`];
  if (result.aviso) lines.push(`⚠️ ${result.aviso}`);
  else if (kind === "sinal" && result.status === "confirmado") lines.push(`Data ${date} confirmada e bloqueada no site.`);

  // Avisa a cliente pelo WhatsApp da Margot, se a conversa estiver aberta.
  const contact = await contactForClientPhone(result.client.phone);
  const firstName = name.split(/\s|&/)[0];
  const balance = result.payments.find((p) => p.kind === "saldo" && p.status !== "cancelado" && p.status !== "recebido");
  const text =
    kind === "sinal"
      ? `Oi, ${firstName}! Recebemos o sinal de ${formatBRL(payment.amountCents)} e a data ${date} está garantida para o MP Lafer. 💍${
          balance?.dueDate ? ` O saldo de ${formatBRL(balance.amountCents)} fica para até ${formatDateBR(balance.dueDate)}.` : ""
        } Qualquer dúvida, é só chamar por aqui.`
      : `Oi, ${firstName}! Recebemos o saldo de ${formatBRL(payment.amountCents)}. Está tudo certo para o grande dia! Qualquer detalhe, é só chamar por aqui.`;
  if (contact && windowOpen(contact)) {
    const sent = await sendText(contact, text, { author: "margot", kind: "confirmacao_cliente" });
    lines.push(sent.ok ? `Avisei ${firstName} pelo WhatsApp.` : `Não consegui avisar ${firstName}: ${sent.message.error}`);
  } else {
    lines.push(`A conversa de ${firstName} comigo está fechada (mais de 24h). Se quiser avisar, mande você: ${text}`);
  }
  return lines.join("\n");
}

async function createExpense(d: Extract<Action, { tipo: "despesa" }>["despesa"]): Promise<string> {
  const e = await saveExpense(
    {
      date: d.data,
      description: d.descricao,
      category: d.categoria,
      supplier: d.fornecedor,
      amountCents: d.valorCents,
      status: d.pago ? "pago" : "a_pagar",
      dueDate: d.pago ? null : d.vencimento,
      orderId: d.pedido ?? undefined,
      notes: "Lançada pelo WhatsApp (Margot).",
    },
    "margot",
  );
  return `✅ Despesa lançada: ${e.description} · ${formatBRL(e.amountCents)} · ${categoryLabel(e.category)}${
    e.status === "a_pagar" ? ` · a pagar${e.dueDate ? ` até ${formatDateBR(e.dueDate)}` : ""}` : " · paga"
  }. Já aparece no Financeiro.`;
}

async function messageClient(contactId: number, text: string): Promise<string> {
  const contact = await prisma.waContact.findUnique({ where: { id: contactId } });
  if (!contact) throw new RuleError("contato_nao_encontrado", "Não achei essa conversa.");
  const name = await contactLabel(contact);
  if (!windowOpen(contact)) {
    return `A conversa com ${name} está fechada (a pessoa não escreve há mais de 24h), e o WhatsApp não deixa eu mandar. Mande pelo seu WhatsApp: https://wa.me/${contact.waId}?text=${encodeURIComponent(text)}`;
  }
  const sent = await sendText(contact, text, { author: "leonardo", kind: "pelo_leonardo" });
  if (sent.ok) await prisma.waContact.update({ where: { id: contact.id }, data: { notifiedAt: null } });
  return sent.ok ? `✅ Enviado para ${name}.` : `Não consegui enviar para ${name}: ${sent.message.error}`;
}

// ─── Descrições para a confirmação ───────────────────────────

export function describeExpense(d: Extract<Action, { tipo: "despesa" }>["despesa"]): string {
  return [
    `Lançar despesa: *${d.descricao}*`,
    `Valor: ${formatBRL(d.valorCents)}`,
    `Categoria: ${categoryLabel(d.categoria)}${d.fornecedor ? ` · ${d.fornecedor}` : ""}`,
    `Data: ${formatDateBR(d.data)} · ${d.pago ? "já paga" : `a pagar${d.vencimento ? ` até ${formatDateBR(d.vencimento)}` : ""}`}`,
  ].join("\n");
}
