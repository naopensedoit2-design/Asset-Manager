// A Margot atendendo clientes no WhatsApp. Mesmo "cérebro" do chat do site (mesmas regras,
// preços e ferramentas), com o que só o WhatsApp permite: proposta e termo por link, reserva
// provisória, comprovante de Pix conferido pelo Leonardo e aviso direto no celular dele.

import { prisma } from "@/lib/prisma";
import * as gestor from "@/lib/gestor/service";
import {
  formatBRL,
  formatCpf,
  formatDateBR,
  isValidCpf,
  RuleError,
  STATUS_LABELS,
  TIMEZONE,
  todayISO,
  type OrderStatus,
  type Settings,
} from "@/lib/gestor/rules";
import { ensurePublicToken } from "@/lib/documents/data";
import { DATE_TOOL, ORDER_FIELDS } from "@/lib/margot/agent";
import { runAgent, systemBlocks, type ToolDef } from "@/lib/margot/claude";
import { appendOrderNote, checkDate, registerOrder, toolError } from "@/lib/margot/orders";
import { buildSystemPrompt } from "@/lib/margot/prompt";
import { overMonthlyLimit, recordUsage, type CallUsage } from "@/lib/margot/usage";
import { proposeAction } from "./actions";
import { downloadMedia, linkButtonMessage, uploadMedia, type Header } from "./client";
import { attachMedia, mediaBlocks, visibleMedia } from "./media";
import { toWhatsApp, truncate } from "./format";
import { buildHistory } from "./history";
import { notifyOwner } from "./notify";
import { canonicalPhone, formatPhone, phoneVariants } from "./phone";
import { sendText } from "./send";
import { contactLabel, isPaused, type WaContact, type WaMessage } from "./store";

const WA_TOOLS: ToolDef[] = [
  DATE_TOOL,
  {
    name: "registrar_pedido",
    description:
      "Registra (ou atualiza) o pedido desta conversa e calcula o orçamento com os preços atuais. Use quando tiver data livre, nome e serviços. O WhatsApp da pessoa o sistema já sabe. Devolve total, sinal, saldo e o link da proposta.",
    input_schema: { type: "object", properties: ORDER_FIELDS, required: ["nome", "data", "servicos"] },
  },
  {
    name: "registrar_dados_contrato",
    description:
      "Guarda os dados de quem contrata, para o Termo Simplificado. Use quando a pessoa quiser fechar e mandar nome completo, CPF (ou passaporte) e endereço. Devolve o link do termo.",
    input_schema: {
      type: "object",
      properties: {
        nome_completo: { type: "string" },
        documento: { type: "string", description: "CPF (11 dígitos) ou passaporte" },
        endereco: { type: "string", description: "Endereço completo com cidade" },
      },
      required: ["nome_completo", "documento", "endereco"],
    },
  },
  {
    name: "reservar_data",
    description:
      "Segura a data do pedido por algumas horas enquanto a pessoa paga o sinal. Use logo depois de registrar_dados_contrato. Devolve o valor do sinal e as instruções de pagamento.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "registrar_comprovante",
    description:
      "Use quando a pessoa mandar o comprovante de um pagamento (imagem ou PDF). Envia ao Leonardo para conferir e confirmar.",
    input_schema: {
      type: "object",
      properties: {
        valor: { type: "string", description: "Valor que aparece no comprovante, se der para ler" },
        observacao: { type: "string", description: "Algo relevante: nome do pagador, data, se parece ser sinal ou saldo" },
      },
    },
  },
  {
    name: "encaminhar_para_leonardo",
    description:
      "Avisa o Leonardo no celular dele de algo que você não pode resolver (desconto, local fora da Serra, mudança depois da reserva, reclamação, pedido para falar com ele, parceria).",
    input_schema: {
      type: "object",
      properties: { motivo: { type: "string", description: "O que a pessoa quer, em uma ou duas frases" } },
      required: ["motivo"],
    },
  },
];

/** Respostas automáticas da Margot por conversa por hora (proteção contra abuso e custo). */
const MAX_REPLIES_PER_HOUR = 15;

interface State {
  contact: WaContact;
  /** Nome para os avisos ao Leonardo (cadastro do cliente ou perfil do WhatsApp). */
  label: string;
  orderId: number | null;
  /** Pedido encerrado desta pessoa (evento passado, perdido ou cancelado), só para contexto. */
  previous: string | null;
  settings: Settings;
  media: WaMessage[];
  usage: CallUsage[];
}

// ─── Contexto da conversa ────────────────────────────────────

async function describeOrder(orderId: number): Promise<string> {
  const o = await gestor.getOrder(orderId).catch(() => null);
  if (!o) return "";
  const site = gestor.siteUrl();
  const lines = [
    `Pedido desta conversa: #${o.id} · ${o.statusLabel} · ${o.eventDate ? formatDateBR(o.eventDate) : "sem data"}${o.eventTime ? ` às ${o.eventTime}` : ""}${o.venue || o.city ? ` · ${[o.venue, o.city].filter(Boolean).join(", ")}` : ""}`,
  ];
  const q = o.quotes[0];
  if (q) {
    lines.push(
      `Orçamento: ${q.items.map((i) => i.name).join(" + ")} · total ${formatBRL(q.totalCents)} · sinal ${formatBRL(q.depositCents)}${q.discountCents ? ` · desconto ${formatBRL(q.discountCents)} (dado pelo Leonardo)` : ""}`,
    );
  }
  if (o.publicToken && site) lines.push(`Link da proposta: ${site}/p/${o.publicToken}`);
  const contract = o.client.legalName && o.client.document && o.client.address;
  lines.push(contract ? `Dados do contrato: completos.${o.publicToken && site ? ` Termo: ${site}/t/${o.publicToken}` : ""}` : "Dados do contrato: ainda não recebidos.");
  if (o.reserva) {
    lines.push(
      o.reserva.kind === "confirmada"
        ? "Reserva: confirmada (sinal pago)."
        : `Reserva: provisória até ${new Date(o.reserva.expiresAt!).toLocaleString("pt-BR", { timeZone: TIMEZONE, dateStyle: "short", timeStyle: "short" })}, esperando o sinal.`,
    );
  }
  for (const p of o.payments.filter((x) => x.status !== "cancelado")) {
    lines.push(
      `${p.kind === "sinal" ? "Sinal" : p.kind === "saldo" ? "Saldo" : "Pagamento"}: ${formatBRL(p.amountCents)} · ${p.status === "recebido" ? "recebido" : `a receber${p.dueDate ? ` até ${formatDateBR(p.dueDate)}` : ""}`}`,
    );
  }
  return lines.join("\n");
}

async function conversationContext(s: State, firstContact: boolean): Promise<string> {
  const lines = [
    `Nome no perfil do WhatsApp: ${s.contact.name || "(sem nome)"} (pode ser apelido; confirme o nome do casal antes de registrar).`,
    firstContact
      ? "Primeiro contato: sim. Apresente-se em uma frase."
      : "Primeiro contato: não. Vocês já conversaram; não se apresente de novo.",
  ];
  if (s.orderId) lines.push(await describeOrder(s.orderId));
  if (s.previous) lines.push(s.previous);
  return lines.filter(Boolean).join("\n");
}

// ─── Ferramentas ─────────────────────────────────────────────

async function linkContact(s: State, orderId: number) {
  s.orderId = orderId;
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { clientId: true } });
  s.contact = await prisma.waContact.update({
    where: { id: s.contact.id },
    data: { orderId, clientId: order?.clientId ?? s.contact.clientId },
  });
  s.label = await contactLabel(s.contact);
}

const who = (s: State) => s.label;

const adminLink = (path: string) => `${gestor.siteUrl()}/admin/${path}`;

async function runTool(name: string, input: any, s: State): Promise<unknown> {
  try {
    if (name === "verificar_data") return await checkDate(input?.data);

    if (name === "registrar_pedido") {
      if (s.orderId) {
        const current = await prisma.order.findUnique({ where: { id: s.orderId }, select: { status: true } });
        if (current && (current.status === "reservado" || current.status === "confirmado")) {
          return { erro: "Este pedido já está com a data reservada. Mudanças agora são com o Leonardo: use encaminhar_para_leonardo." };
        }
      }
      const r = await registerOrder({
        input,
        phone: canonicalPhone(s.contact.waId),
        phoneVariants: phoneVariants(s.contact.waId),
        currentOrderId: s.orderId,
        channelNote: "Pedido feito pelo WhatsApp com a Margot.",
        recentDays: 45,
        defaultSource: "outro",
      });
      if ("erro" in r) return r;
      await linkContact(s, r.orderId);
      const token = await ensurePublicToken(r.orderId);
      const site = gestor.siteUrl();
      if (r.created) {
        const o = r.order;
        const body = `🆕 Novo pedido pela Margot no WhatsApp\n${o.client.name} · ${r.resultado.data}${o.city ? ` · ${o.city}` : ""}\n${r.resultado.servicos.join(" + ")}\nTotal ${r.resultado.total}. Proposta enviada.`;
        await notifyOwner({
          text: body,
          summary: `novo pedido de ${o.client.name} para ${r.resultado.data}, total ${r.resultado.total}`,
          build: () => linkButtonMessage(body, "Abrir pedido", adminLink(`pedidos/${r.orderId}`)),
        });
      }
      return {
        ...r.resultado,
        link_proposta: site ? `${site}/p/${token}` : null,
        proximo_passo: "Envie o link da proposta. Para garantir a data: dados do contrato e o sinal via Pix.",
      };
    }

    if (name === "registrar_dados_contrato") {
      if (!s.orderId) return { erro: "Registre o pedido primeiro (registrar_pedido)." };
      const legalName = String(input?.nome_completo ?? "").trim();
      const doc = String(input?.documento ?? "").trim();
      const address = String(input?.endereco ?? "").trim();
      if (legalName.split(/\s+/).length < 2) return { erro: "Peça o nome completo (nome e sobrenome)." };
      const digits = doc.replace(/\D/g, "");
      if (digits.length === 11 && !isValidCpf(digits)) return { erro: "Esse CPF não parece válido. Peça para a pessoa conferir." };
      if (doc.length < 5) return { erro: "Peça o CPF (ou passaporte, se for estrangeiro)." };
      if (address.length < 10) return { erro: "Peça o endereço completo, com cidade." };
      const formatted = formatCpf(doc);
      await gestor.updateOrder(s.orderId, { client: { legalName, document: formatted, address } }, "margot");
      const token = await ensurePublicToken(s.orderId);
      return { ok: true, link_termo: `${gestor.siteUrl()}/t/${token}`, proximo_passo: "Agora use reservar_data." };
    }

    if (name === "reservar_data") {
      if (!s.orderId) return { erro: "Registre o pedido primeiro (registrar_pedido)." };
      const before = await gestor.getOrder(s.orderId);
      if (!before.client.legalName || !before.client.document || !before.client.address) {
        return { erro: "Faltam os dados do contrato (registrar_dados_contrato)." };
      }
      if (!before.quotes.length) return { erro: "O pedido ainda não tem orçamento (registrar_pedido)." };
      const order = before.status === "reservado" || before.status === "confirmado" ? before : await gestor.reserveOrder(s.orderId, "margot");
      const token = await ensurePublicToken(s.orderId);
      const sinal = order.payments.find((p) => p.kind === "sinal" && p.status !== "cancelado");
      const amount = sinal?.amountCents ?? order.quotes[0].depositCents;
      const until = order.reserva?.expiresAt
        ? new Date(order.reserva.expiresAt).toLocaleString("pt-BR", { timeZone: TIMEZONE, dateStyle: "short", timeStyle: "short" })
        : null;
      const pix = s.settings.pixKey.trim();
      const termo = `${gestor.siteUrl()}/t/${token}`;
      if (before.status !== "reservado" && before.status !== "confirmado") {
        const body = `📅 ${order.client.name} quer fechar ${order.eventDate ? formatDateBR(order.eventDate) : ""} (pedido #${order.id}).\nData segura${until ? ` até ${until}` : ""} esperando o sinal de ${formatBRL(amount)}.${pix ? "" : "\n⚠️ Sua chave Pix não está em Regras: mande a chave para a cliente."}`;
        await notifyOwner({
          text: body,
          summary: `${order.client.name} quer fechar o pedido ${order.id}; sinal de ${formatBRL(amount)}`,
          build: () => linkButtonMessage(body, "Abrir pedido", adminLink(`pedidos/${order.id}`)),
        });
      }
      if (sinal?.status === "recebido") return { ja_confirmado: true, mensagem: "O sinal já foi recebido; a data está garantida." };
      return {
        reserva: "provisória",
        valida_ate: until,
        sinal: formatBRL(amount),
        link_termo: termo,
        instrucao_pagamento: pix
          ? `Pix de ${formatBRL(amount)} para a chave ${pix}${s.settings.contractorName ? ` (${s.settings.contractorName})` : ""}. Depois é só mandar o comprovante por aqui.`
          : "O Leonardo envia a chave Pix por aqui em seguida.",
      };
    }

    if (name === "registrar_comprovante") {
      // O arquivo desta leva de mensagens ou, se a pessoa falar de um que mandou antes, o último das últimas 24h.
      const file =
        s.media[s.media.length - 1] ??
        (await prisma.waMessage.findFirst({
          where: {
            contactId: s.contact.id,
            direction: "in",
            type: { in: ["image", "document"] },
            mediaId: { not: "" },
            createdAt: { gte: new Date(Date.now() - 86_400_000) },
          },
          orderBy: { id: "desc" },
        }));
      if (!file) return { erro: "Não encontrei o arquivo do comprovante. Peça para a pessoa mandar a imagem ou o PDF por aqui." };
      const valor = String(input?.valor ?? "").trim().slice(0, 40);
      const obs = String(input?.observacao ?? "").trim().slice(0, 300);
      await appendOrderNote(s.orderId, `[Comprovante recebido pelo WhatsApp] ${valor}${obs ? ` · ${obs}` : ""}`);

      // Cópia do arquivo para mostrar ao Leonardo junto dos botões.
      let header: Header | undefined;
      let copy: { id: string; mime: string } | undefined;
      try {
        const { data, mime } = await downloadMedia(file.mediaId);
        const plain = mime.split(";")[0];
        const copyId = await uploadMedia(data, plain, file.fileName || (plain.includes("pdf") ? "comprovante.pdf" : "comprovante.jpg"));
        copy = { id: copyId, mime: plain };
        header = file.type === "image" ? { type: "image", image: { id: copyId } } : { type: "document", document: { id: copyId, filename: file.fileName || "comprovante.pdf" } };
      } catch (e) {
        console.error("[whatsapp] cópia do comprovante", e);
      }

      if (!s.orderId) {
        const body = `📎 ${who(s)} mandou um comprovante${valor ? ` de ${valor}` : ""}, mas ainda não tem pedido registrado.${obs ? `\n${obs}` : ""}`;
        await notifyOwner({
          text: body,
          summary: `${who(s)} mandou um comprovante${valor ? ` de ${valor}` : ""} sem pedido registrado`,
          build: () => linkButtonMessage(body, "Abrir conversa", adminLink(`conversas/${s.contact.id}`)),
        });
        return { ok: true, instrucao: "Agradeça e diga que o Leonardo confere e retorna em seguida." };
      }

      const o = await gestor.getOrder(s.orderId);
      const sinal = o.payments.find((p) => p.kind === "sinal" && p.status !== "cancelado");
      const saldo = o.payments.find((p) => p.kind === "saldo" && p.status !== "cancelado");
      const kind: "sinal" | "saldo" = sinal?.status === "recebido" && saldo && saldo.status !== "recebido" ? "saldo" : "sinal";
      const expected = kind === "saldo" ? saldo!.amountCents : (sinal?.amountCents ?? o.quotes[0]?.depositCents ?? 0);
      const body = [
        `📎 Comprovante de ${o.client.name} (pedido #${o.id}${o.eventDate ? ` · ${formatDateBR(o.eventDate)}` : ""})`,
        `${kind === "sinal" ? "Sinal" : "Saldo"} esperado: ${formatBRL(expected)}${valor ? ` · no comprovante: ${valor}` : ""}`,
        obs,
        `Confira no banco antes de confirmar. Ao confirmar, eu marco como recebido${kind === "sinal" ? ", garanto a data" : ""} e aviso ${o.client.name.split(/\s|&/)[0]}.`,
      ]
        .filter(Boolean)
        .join("\n");
      await proposeAction(
        { tipo: "pagamento", pedido: o.id, pagamento: kind },
        body,
        `${o.client.name} mandou o comprovante do ${kind} (pedido ${o.id}), confira e confirme`,
        header,
        copy,
      );
      return { ok: true, instrucao: "Agradeça e diga que o Leonardo confere e confirma a reserva em seguida." };
    }

    if (name === "encaminhar_para_leonardo") {
      const motivo = String(input?.motivo ?? "").slice(0, 500);
      await appendOrderNote(s.orderId, `[Margot pediu sua ajuda] ${motivo}`);
      const recent = s.contact.notifiedAt && Date.now() - s.contact.notifiedAt.getTime() < 10 * 60_000;
      if (!recent) {
        const body = `🙋 ${who(s)} (${formatPhone(s.contact.waId)}${s.orderId ? ` · pedido #${s.orderId}` : ""}) precisa de você:\n${motivo}`;
        await notifyOwner({
          text: body,
          summary: `${who(s)} precisa de você: ${motivo}`,
          build: () => linkButtonMessage(body, "Abrir conversa", adminLink(`conversas/${s.contact.id}`)),
        });
        await prisma.waContact.update({ where: { id: s.contact.id }, data: { notifiedAt: new Date() } });
      }
      return { ok: true, instrucao: "Diga que o Leonardo já foi avisado e responde por aqui mesmo assim que puder." };
    }

    return { erro: `Ferramenta desconhecida: ${name}` };
  } catch (e) {
    if (e instanceof RuleError && e.code === "data_ocupada") {
      return { erro: "Essa data acabou de ficar indisponível. Diga isso com gentileza e use encaminhar_para_leonardo." };
    }
    return toolError(e, name);
  }
}

// ─── Atendimento ─────────────────────────────────────────────

/** Avisa o Leonardo (no máximo a cada 10 minutos por conversa) que chegou mensagem e a Margot não vai responder. */
async function forwardToOwner(contact: WaContact, pending: WaMessage[], reason: string) {
  if (contact.notifiedAt && Date.now() - contact.notifiedAt.getTime() < 10 * 60_000) return;
  const preview = truncate(pending.map((m) => m.text || `[${m.type}]`).join(" / "), 300);
  const name = await contactLabel(contact);
  const body = `💬 ${name}: ${preview}\n(${reason})`;
  await notifyOwner({
    text: body,
    summary: `mensagem de ${name}: ${preview}`,
    build: () => linkButtonMessage(body, "Responder", adminLink(`conversas/${contact.id}`)),
  });
  await prisma.waContact.update({ where: { id: contact.id }, data: { notifiedAt: new Date() } });
}

/** Resposta automática simples quando a Margot está sem IA (no máximo uma a cada 12h por conversa). */
async function fallbackReply(contact: WaContact) {
  const recent = await prisma.waMessage.findFirst({
    where: { contactId: contact.id, kind: "resposta_automatica", createdAt: { gte: new Date(Date.now() - 12 * 3_600_000) } },
  });
  if (recent) return;
  await sendText(
    contact,
    "Olá! Recebemos sua mensagem. O Leonardo, da Eu Casei de Lafer, responde por aqui assim que possível. 💍",
    { author: "sistema", kind: "resposta_automatica" },
  );
}

export async function respondToClient(contact: WaContact, pending: WaMessage[]): Promise<void> {
  const settings = await gestor.getSettings();
  const meaningful = pending.filter((m) => !["reaction", "sticker"].includes(m.type));
  if (!meaningful.length) return; // só figurinha ou reação: não precisa responder

  if (isPaused(contact)) {
    await forwardToOwner(contact, meaningful, "você assumiu esta conversa; a Margot está pausada nela");
    return;
  }
  if (!settings.margotWhatsapp) {
    await forwardToOwner(contact, meaningful, "a Margot está desligada no WhatsApp, em Regras");
    return;
  }
  if (!process.env["ANTHROPIC_API_KEY"] || (await overMonthlyLimit(settings.margotLimitUsd))) {
    await fallbackReply(contact);
    await forwardToOwner(contact, meaningful, "a Margot está sem IA agora: sem chave ou limite do mês");
    return;
  }
  const lastHour = await prisma.waMessage.count({
    where: { contactId: contact.id, direction: "out", author: "margot", createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  });
  if (lastHour >= MAX_REPLIES_PER_HOUR) {
    await prisma.waContact.update({ where: { id: contact.id }, data: { pausedUntil: new Date(Date.now() + 12 * 3_600_000) } });
    await forwardToOwner(contact, meaningful, "muitas mensagens em pouco tempo: pausei a Margot nesta conversa por 12h");
    return;
  }

  const rows = await prisma.waMessage.findMany({
    where: { contactId: contact.id },
    orderBy: { id: "desc" },
    take: 60,
  });
  rows.reverse();
  const firstContact = !rows.some((r) => r.direction === "out" && r.status !== "falhou" && (r.author === "margot" || r.author === "leonardo"));
  // Pedido já encerrado (evento passado, perdido, cancelado) não é "o pedido desta conversa":
  // se a pessoa voltar para um novo evento, a Margot registra um pedido novo.
  let orderId = contact.orderId;
  let previous: string | null = null;
  if (orderId) {
    const o = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, eventDate: true } });
    if (!o || ["realizado", "perdido", "cancelado"].includes(o.status)) {
      if (o) {
        previous = `Pedido anterior desta pessoa: #${orderId} (${STATUS_LABELS[o.status as OrderStatus] ?? o.status}${o.eventDate ? `, ${formatDateBR(o.eventDate.toISOString().slice(0, 10))}` : ""}). Para um novo evento, registre um pedido novo.`;
      }
      orderId = null;
    }
  }
  const s: State = {
    contact,
    label: await contactLabel(contact),
    orderId,
    previous,
    settings,
    media: pending.filter((m) => (m.type === "image" || m.type === "document") && m.mediaId),
    usage: [],
  };
  const services = await gestor.listServices({ activeOnly: true });
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: TIMEZONE }).format(now);
  const prompt = buildSystemPrompt({
    channel: "whatsapp",
    today: todayISO(now),
    weekday,
    services,
    settings,
    orderId: s.orderId,
    conversation: await conversationContext(s, firstContact),
  });

  const turns = buildHistory(rows);
  const messages: { role: string; content: unknown }[] = turns.map((t) => ({ role: t.role, content: t.content }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return;
  attachMedia(messages, await mediaBlocks(visibleMedia(pending)));

  try {
    const result = await runAgent({
      system: systemBlocks(prompt.fixed, prompt.variable),
      tools: WA_TOOLS,
      messages,
      runTool: (name, input) => runTool(name, input, s),
      usage: s.usage,
    });
    const text = result.exhausted
      ? "Vou pedir para o Leonardo continuar com você por aqui, tudo bem? Ele já foi avisado."
      : toWhatsApp(result.text);
    if (result.exhausted) await forwardToOwner(s.contact, meaningful, "a Margot se enrolou nesta conversa");
    if (text) await sendText(s.contact, text, { author: "margot" });
  } catch (e) {
    console.error("[whatsapp] Margot", e);
    await sendText(
      s.contact,
      "Desculpe, tive um probleminha para responder agora. Já avisei o Leonardo e ele te responde por aqui em breve.",
      { author: "sistema", kind: "erro" },
    );
    await forwardToOwner(s.contact, meaningful, `a Margot teve um erro: ${(e as Error).message.slice(0, 120)}`);
  } finally {
    await recordUsage(s.usage, "whatsapp", contact.waId).catch((e) => console.error("[whatsapp] uso", e));
  }
}
