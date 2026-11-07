// Ações que só acontecem depois do "sim" do Leonardo: dar baixa em pagamento (confirma a data),
// lançar despesa e mandar mensagem para cliente em nome dele. A Margot (o modelo) só PROPÕE;
// quem executa é este código, quando o Leonardo toca em Confirmar ou responde "sim".

import { prisma } from "@/lib/prisma";
import * as gestor from "@/lib/gestor/service";
import { payExpensePart, saveExpense } from "@/lib/gestor/finance-service";
import { categoryLabel } from "@/lib/gestor/finance";
import { formatBRL, formatCpf, formatDateBR, RuleError, STATUS_LABELS, TIMEZONE } from "@/lib/gestor/rules";
import { ensurePublicToken } from "@/lib/documents/data";
import { appendOrderNote } from "@/lib/margot/orders";
import { itensDoOrcamento, lerPedido, type Edicao, type PedidoNovo, type Recebimento } from "./pedido";
import { phoneVariants } from "./phone";
import { buttonsMessage, type Header } from "./client";
import { notifyOwner } from "./notify";
import { sendText } from "./send";
import { contactForClientPhone, contactLabel, windowOpen, type WaContact } from "./store";

export type Action =
  // `comprovante`: mensagem do WhatsApp em que o Leonardo mandou o comprovante (fica anotada no pedido).
  | { tipo: "pagamento"; pedido: number; pagamento: "sinal" | "saldo"; comprovante?: number | null }
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
  | { tipo: "mensagem"; contato: number; texto: string }
  | { tipo: "pedido"; pedido: PedidoNovo }
  // Novo orçamento com desconto. `totalCents` é o total que o Leonardo viu na confirmação.
  | { tipo: "valor"; pedido: number; descontoCents: number; totalCents: number }
  | { tipo: "contrato"; pedido: number; nomeCompleto: string; documento: string; endereco: string; email: string }
  | { tipo: "passado"; pedido: PedidoNovo; pagamentos: Recebimento[] }
  | { tipo: "recebimento"; pedido: number; recebimento: Recebimento }
  | { tipo: "edicao"; pedido: number; campos: Edicao }
  | { tipo: "status"; pedido: number; status: string; nota: string }
  // Excluir de vez um pedido repetido ou criado por engano (a regra está em gestor/exclusao.ts e roda de novo ao confirmar).
  | { tipo: "exclusao"; pedido: number; motivo?: string }
  // Abater parte de (ou quitar) uma conta a pagar. `saldoCents` é o saldo que o Leonardo viu na confirmação.
  | { tipo: "abatimento"; conta: number; valorCents: number; saldoCents: number; data: string };

export function parseAction(raw: string): Action | null {
  try {
    const a = JSON.parse(raw);
    if (a?.tipo === "pagamento" && Number.isInteger(a.pedido) && (a.pagamento === "sinal" || a.pagamento === "saldo")) return a;
    if (a?.tipo === "despesa" && a.despesa && Number.isInteger(a.despesa.valorCents)) return a;
    if (a?.tipo === "mensagem" && Number.isInteger(a.contato) && typeof a.texto === "string") return a;
    if (a?.tipo === "valor" && Number.isInteger(a.pedido) && Number.isInteger(a.descontoCents) && Number.isInteger(a.totalCents)) return a;
    if (
      a?.tipo === "contrato" &&
      Number.isInteger(a.pedido) &&
      typeof a.nomeCompleto === "string" &&
      typeof a.documento === "string" &&
      typeof a.endereco === "string"
    ) {
      return { ...a, email: typeof a.email === "string" ? a.email : "" };
    }
    if (a?.tipo === "passado" && Array.isArray(a.pagamentos)) {
      const pedido = lerPedido(a.pedido);
      return pedido ? { tipo: "passado", pedido, pagamentos: a.pagamentos } : null;
    }
    if (a?.tipo === "recebimento" && Number.isInteger(a.pedido) && a.recebimento && Number.isInteger(a.recebimento.amountCents)) return a;
    if (a?.tipo === "edicao" && Number.isInteger(a.pedido) && a.campos && typeof a.campos === "object") return a;
    if (a?.tipo === "status" && Number.isInteger(a.pedido) && typeof a.status === "string") return a;
    if (a?.tipo === "exclusao" && Number.isInteger(a.pedido)) {
      return { tipo: "exclusao", pedido: a.pedido, motivo: typeof a.motivo === "string" ? a.motivo : "" };
    }
    if (a?.tipo === "pedido") {
      const pedido = lerPedido(a.pedido);
      return pedido ? { tipo: "pedido", pedido } : null;
    }
    if (
      a?.tipo === "abatimento" &&
      Number.isInteger(a.conta) &&
      Number.isInteger(a.valorCents) &&
      Number.isInteger(a.saldoCents) &&
      typeof a.data === "string"
    ) {
      return a;
    }
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
    if (action.tipo === "pagamento") return await confirmPayment(action.pedido, action.pagamento, action.comprovante ?? null);
    if (action.tipo === "valor") return await adjustOrderValue(action);
    if (action.tipo === "contrato") return await saveContractData(action);
    if (action.tipo === "passado") return await createPastFromChat(action.pedido, action.pagamentos);
    if (action.tipo === "recebimento") return await receivePayment(action.pedido, action.recebimento);
    if (action.tipo === "edicao") return await editOrder(action.pedido, action.campos);
    if (action.tipo === "status") return await setStatus(action.pedido, action.status, action.nota);
    if (action.tipo === "exclusao") return await removeOrder(action.pedido, action.motivo ?? "");
    if (action.tipo === "despesa") return await createExpense(action.despesa);
    if (action.tipo === "abatimento") return await payExpense(action);
    if (action.tipo === "pedido") return await createOrderFromChat(action.pedido);
    return await messageClient(action.contato, action.texto);
  } catch (e) {
    // Deixa tentar de novo se falhou.
    await prisma.waMessage.update({ where: { id: rowId }, data: { actionDoneAt: null } });
    if (e instanceof RuleError) return `Não deu certo: ${e.message}`;
    console.error("[whatsapp] ação do Leonardo", e);
    return "Deu um erro ao fazer isso. Tente pelo painel, por favor.";
  }
}

// ─── Pedido repetido ─────────────────────────────────────────

/**
 * Pedido ativo (nem cancelado nem perdido) desta cliente para este dia. Só há um carro, então não existem dois:
 * quem repete o pedido de um mesmo dia está duplicando (foi o que aconteceu com dois botões iguais confirmados).
 */
export async function pedidoDoMesmoDia(telefone: string, data: string) {
  return prisma.order.findFirst({
    where: {
      client: { phone: { in: phoneVariants(telefone) } },
      eventDate: new Date(`${data}T00:00:00Z`),
      status: { notIn: ["cancelado", "perdido"] },
    },
    select: { id: true, status: true, client: { select: { name: true } } },
    orderBy: { id: "asc" },
  });
}

function jaExiste(o: { id: number; status: string; client: { name: string } }, data: string): string {
  const status = STATUS_LABELS[o.status as keyof typeof STATUS_LABELS] ?? o.status;
  return `⚠️ Não criei outro: ${o.client.name} já tem o pedido #${o.id} para ${formatDateBR(data)} (${status}). Nada foi duplicado.`;
}

// ─── Execução ────────────────────────────────────────────────

async function confirmPayment(orderId: number, kind: "sinal" | "saldo", receiptMessageId: number | null = null): Promise<string> {
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
  if (receiptMessageId) {
    const receipt = await prisma.waMessage.findUnique({ where: { id: receiptMessageId }, select: { createdAt: true, type: true } });
    if (receipt) {
      const when = receipt.createdAt.toLocaleString("pt-BR", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      await appendOrderNote(orderId, `[Comprovante do ${kind}] Enviado pelo Leonardo no WhatsApp da Margot em ${when} (${receipt.type === "image" ? "imagem" : "arquivo"}; está em Conversas, mensagem #${receiptMessageId}).`);
      lines.push("Comprovante anotado no pedido.");
    }
  }
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

async function createOrderFromChat(p: PedidoNovo): Promise<string> {
  // Se um botão igual já foi confirmado, o pedido existe: não cria o segundo.
  const ja = await pedidoDoMesmoDia(p.telefone, p.data);
  if (ja) return jaExiste(ja, p.data);
  const services = await gestor.listServices({ activeOnly: true });
  const items = itensDoOrcamento(p.servicos, services, p.valorCents);
  // Mantém o telefone já cadastrado (pode estar na forma sem o nono dígito).
  const known = await prisma.client.findFirst({ where: { phone: { in: phoneVariants(p.telefone) } }, select: { phone: true } });
  const { order } = await gestor.createOrder(
    {
      client: { name: p.nome, phone: known?.phone ?? p.telefone, source: p.origem ?? "outro" },
      eventDate: p.data,
      eventTime: p.horario,
      venue: p.local,
      city: p.cidade,
      serviceIds: p.servicos,
      notes: `Pedido criado pelo WhatsApp (Margot), a pedido do Leonardo.${p.notas ? `\n${p.notas}` : ""}`,
      googleEventId: p.evento ?? "",
    },
    "admin",
  );
  const where = [order.venue, order.city].filter(Boolean).join(", ");
  const lines = [`✅ Pedido #${order.id} criado: ${order.client.name} · ${formatDateBR(p.data)}${where ? ` · ${where}` : ""}.`];
  if (!items.length) {
    lines.push("Ainda sem orçamento: registre os serviços e o valor no painel (Gestão).");
    return lines.join("\n");
  }
  try {
    const { totais } = await gestor.createQuote(order.id, { items, markSent: false }, "admin");
    lines.push(`Total ${formatBRL(totais.totalCents)} · sinal ${formatBRL(totais.depositCents)} · saldo ${formatBRL(totais.balanceCents)}.`);
    lines.push(`Quando o sinal cair, me diga "deu baixa no sinal do #${order.id}" que eu reservo a data.`);
  } catch (e) {
    if (!(e instanceof RuleError)) console.error("[whatsapp] orçamento do pedido criado pelo WhatsApp", e);
    lines.push(`O pedido foi criado, mas o orçamento não: ${e instanceof RuleError ? e.message : "deu um erro"}. Registre no painel.`);
  }
  return lines.join("\n");
}

async function adjustOrderValue(a: Extract<Action, { tipo: "valor" }>): Promise<string> {
  const order = await gestor.getOrder(a.pedido);
  const received = order.payments.filter((p) => p.status === "recebido").reduce((sum, p) => sum + p.amountCents, 0);
  if (received > a.totalCents) {
    throw new RuleError("total_menor_que_recebido", `Já entraram ${formatBRL(received)} no pedido #${a.pedido}, mais que o novo total.`);
  }
  const quote = order.quotes[0];
  if (!quote) throw new RuleError("sem_orcamento", `O pedido #${a.pedido} ainda não tem orçamento. Registre no painel.`);
  const { totais } = await gestor.createQuote(
    a.pedido,
    { items: quote.items, discountCents: a.descontoCents, markSent: Boolean(quote.sentAt) },
    "admin",
  );
  if (totais.totalCents !== a.totalCents) {
    console.error("[whatsapp] ajuste de valor: total diferente do confirmado", a.pedido);
  }
  // Com pagamento já lançado, o saldo em aberto passa a ser o que falta para o novo total.
  const open = order.payments.filter((p) => p.status === "a_receber" || p.status === "atrasado");
  const balance = open.find((p) => p.kind === "saldo");
  let saldoLine = "";
  if (order.payments.some((p) => p.status !== "cancelado")) {
    const missing = totais.totalCents - received - open.filter((p) => p !== balance).reduce((sum, p) => sum + p.amountCents, 0);
    if (balance && missing > 0) {
      await gestor.updatePayment(balance.id, { amountCents: missing }, "admin");
      saldoLine = ` Saldo em aberto agora: ${formatBRL(missing)}.`;
    } else if (balance && missing <= 0) {
      await gestor.updatePayment(balance.id, { status: "cancelado" }, "admin");
      saldoLine = " Não falta saldo: o saldo em aberto foi cancelado.";
    } else if (missing > 0) {
      saldoLine = ` Falta receber ${formatBRL(missing)} (sem saldo lançado: registre quando entrar).`;
    }
  }
  await appendOrderNote(a.pedido, `[Valor ajustado pelo WhatsApp] Total ${formatBRL(totais.totalCents)}${a.descontoCents ? `, desconto de ${formatBRL(a.descontoCents)}` : ""}, autorizado pelo Leonardo.`);
  return received || saldoLine
    ? `✅ Pedido #${a.pedido}: total ${formatBRL(totais.totalCents)}; já recebido ${formatBRL(received)}.${saldoLine}`
    : `✅ Pedido #${a.pedido}: total ${formatBRL(totais.totalCents)} · sinal ${formatBRL(totais.depositCents)} · saldo ${formatBRL(totais.balanceCents)}.`;
}

async function createPastFromChat(p: PedidoNovo, pagamentos: Recebimento[]): Promise<string> {
  // Se um botão igual já foi confirmado, o evento existe: não registra o segundo (o dinheiro entraria duas vezes).
  const ja = await pedidoDoMesmoDia(p.telefone, p.data);
  if (ja) return jaExiste(ja, p.data);
  const services = await gestor.listServices();
  const items = itensDoOrcamento(p.servicos, services, p.valorCents);
  const known = await prisma.client.findFirst({ where: { phone: { in: phoneVariants(p.telefone) } }, select: { phone: true } });
  const order = await gestor.createPastOrder(
    {
      client: { name: p.nome, phone: known?.phone ?? p.telefone, source: p.origem ?? "outro" },
      eventDate: p.data,
      eventTime: p.horario,
      venue: p.local,
      city: p.cidade,
      serviceIds: p.servicos,
      notes: `Evento já realizado, registrado depois pelo WhatsApp (Margot).${p.notas ? `\n${p.notas}` : ""}`,
      items,
      payments: pagamentos,
    },
    "admin",
  );
  const received = order.payments.filter((x) => x.status === "recebido").reduce((sum, x) => sum + x.amountCents, 0);
  return `✅ Evento registrado: pedido #${order.id}, ${order.client.name}, ${formatDateBR(p.data)}, *realizado*. Recebido ${formatBRL(received)}; já aparece no Financeiro.`;
}

async function receivePayment(orderId: number, r: Recebimento): Promise<string> {
  const order = await gestor.getOrder(orderId);
  // Usa o sinal ou saldo em aberto quando o valor bate; senão lança um pagamento novo com o valor informado.
  const open = order.payments.find((p) => p.kind === r.kind && (p.status === "a_receber" || p.status === "atrasado"));
  const result =
    open && open.amountCents === r.amountCents
      ? await gestor.updatePayment(open.id, { status: "recebido", paidAt: r.paidAt }, "admin")
      : await gestor.addPayment(orderId, { kind: r.kind, amountCents: r.amountCents, status: "recebido", paidAt: r.paidAt }, "admin");
  const lines = [`✅ ${r.kind === "sinal" ? "Sinal" : r.kind === "saldo" ? "Saldo" : "Pagamento"} de ${formatBRL(r.amountCents)} registrado no pedido #${orderId} (${formatDateBR(r.paidAt)}).`];
  if (open && open.amountCents !== r.amountCents) {
    lines.push(`O ${r.kind} em aberto era de ${formatBRL(open.amountCents)} e continua em aberto: se este pagamento o substitui, me peça para ajustar o valor do pedido.`);
  }
  if (result.aviso) lines.push(`⚠️ ${result.aviso}`);
  else if (result.status !== order.status) lines.push(`Status: ${STATUS_LABELS[result.status as keyof typeof STATUS_LABELS] ?? result.status}.`);
  return lines.join("\n");
}

async function editOrder(orderId: number, c: Edicao): Promise<string> {
  const input: Record<string, any> = {};
  if (c.data !== undefined) input.eventDate = c.data;
  if (c.horario !== undefined) input.eventTime = c.horario;
  if (c.local !== undefined) input.venue = c.local;
  if (c.cidade !== undefined) input.city = c.cidade;
  if (c.nome !== undefined || c.telefone !== undefined) {
    input.client = { ...(c.nome !== undefined && { name: c.nome }), ...(c.telefone !== undefined && { phone: c.telefone }) };
  }
  if (Object.keys(input).length) await gestor.updateOrder(orderId, input, "admin");
  if (c.observacao) await appendOrderNote(orderId, `[Leonardo, pelo WhatsApp] ${c.observacao}`);
  return `✅ Pedido #${orderId} atualizado.`;
}

async function setStatus(orderId: number, status: string, note: string): Promise<string> {
  const order = await gestor.changeStatus(orderId, status, "admin", note || "Pelo WhatsApp (Margot)");
  return `✅ Pedido #${orderId}: ${STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status}.`;
}

async function removeOrder(orderId: number, motivo: string): Promise<string> {
  const r = await gestor.deleteOrder(orderId, "margot", motivo);
  const quando = r.data ? ` de ${formatDateBR(r.data)}` : "";
  const resto =
    r.duplicadoDe !== null
      ? ` O pedido #${r.duplicadoDe} continua${r.recebidoCents ? ", com os pagamentos; o Financeiro conta cada valor uma vez só" : ""}.`
      : "";
  return `🗑️ Pedido #${r.pedido} (${r.cliente}${quando}) excluído.${resto}`;
}

async function saveContractData(a: Extract<Action, { tipo: "contrato" }>): Promise<string> {
  await gestor.updateOrder(
    a.pedido,
    { client: { legalName: a.nomeCompleto, document: formatCpf(a.documento), address: a.endereco, ...(a.email && { email: a.email }) } },
    "admin",
  );
  const token = await ensurePublicToken(a.pedido);
  return `✅ Dados do contrato salvos no pedido #${a.pedido}. Termo: ${gestor.siteUrl()}/t/${token}`;
}

async function payExpense(a: Extract<Action, { tipo: "abatimento" }>): Promise<string> {
  const r = await payExpensePart({ id: a.conta, paidCents: a.valorCents, date: a.data, expectedCents: a.saldoCents }, "margot");
  if (r.kind === "total") {
    return `✅ Conta quitada: ${r.paid.description} · ${formatBRL(r.paid.amountCents)}. Já aparece em "Pagas" no Financeiro.`;
  }
  return `✅ Abatidos ${formatBRL(r.paid.amountCents)} de "${r.open.description}". Saldo em aberto: ${formatBRL(r.open.amountCents)}. O pagamento aparece em "Pagas" no Financeiro, e o custo total não mudou.`;
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
