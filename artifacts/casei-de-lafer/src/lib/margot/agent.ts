// A Margot: atendimento do chat do site. Conversa via API do Claude e usa
// ferramentas que leem e escrevem no mesmo banco do painel /admin.

import { prisma } from "@/lib/prisma";
import * as gestor from "@/lib/gestor/service";
import { formatBRL, normalizePhone, RuleError, TIMEZONE, todayISO } from "@/lib/gestor/rules";
import { buildSystemPrompt } from "./prompt";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  reply: string;
  orderId: number | null;
  encaminhado: boolean;
}

const API_URL = `${process.env["ANTHROPIC_BASE_URL"] ?? "https://api.anthropic.com"}/v1/messages`;
const MODEL = process.env["MARGOT_MODEL"] || "claude-sonnet-5-5";
const MAX_TOOL_ROUNDS = 6;

const TOOLS = [
  {
    name: "verificar_data",
    description:
      "Confere se uma data está livre na agenda do carro. Use sempre antes de falar sobre disponibilidade.",
    input_schema: {
      type: "object",
      properties: { data: { type: "string", description: "Data no formato AAAA-MM-DD" } },
      required: ["data"],
    },
  },
  {
    name: "registrar_pedido",
    description:
      "Registra (ou atualiza) o pedido e calcula o orçamento com os preços atuais. Use quando tiver data livre, nome, WhatsApp e serviços. Devolve total, sinal e saldo.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome de quem está pedindo (noiva, noivo ou cerimonialista)" },
        whatsapp: { type: "string", description: "WhatsApp com DDD" },
        data: { type: "string", description: "Data do casamento, AAAA-MM-DD" },
        horario: { type: "string", description: "Horário aproximado, HH:MM" },
        local: { type: "string", description: "Local da cerimônia" },
        cidade: { type: "string" },
        servicos: { type: "array", items: { type: "integer" }, description: "ids dos serviços escolhidos" },
        origem: {
          type: "string",
          enum: ["instagram", "indicacao", "site", "cerimonialista", "outro"],
          description: "Como conheceu, se a pessoa disser; senão 'site'",
        },
        quem_indicou: { type: "string" },
        resumo: { type: "string", description: "Resumo do que importa na conversa, para o Leonardo ler" },
      },
      required: ["nome", "whatsapp", "data", "servicos"],
    },
  },
  {
    name: "encaminhar_para_leonardo",
    description:
      "Avisa o Leonardo de algo que você não pode resolver (desconto, local fora da Serra, ensaio, dúvida fora do roteiro).",
    input_schema: {
      type: "object",
      properties: { motivo: { type: "string" } },
      required: ["motivo"],
    },
  },
];

interface ToolState {
  orderId: number | null;
  encaminhado: boolean;
}

async function runTool(name: string, input: any, state: ToolState): Promise<unknown> {
  try {
    if (name === "verificar_data") {
      const r = await gestor.checkAvailability(input?.data);
      if (r.passado) return { data: r.data, status: "passou", mensagem: "Essa data já passou." };
      return { data: r.data, status: r.status };
    }

    if (name === "registrar_pedido") {
      const availability = await gestor.checkAvailability(input?.data);
      if (availability.passado) return { erro: "Essa data já passou." };
      const phone = normalizePhone(String(input?.whatsapp ?? ""));
      const existingId = await findOrderToUpdate(state.orderId, phone);
      const ownDate =
        existingId !== null &&
        (await prisma.order.findUnique({ where: { id: existingId }, select: { eventDate: true } }))?.eventDate
          ?.toISOString()
          .slice(0, 10) === availability.data;
      if (!availability.livre && !ownDate) return { erro: "Essa data não está disponível." };

      const notes = `Pedido feito pelo chat do site com a Margot.${input?.resumo ? `\n${String(input.resumo).slice(0, 1500)}` : ""}`;
      const payload = {
        client: {
          name: input?.nome,
          phone,
          source: input?.origem ?? "site",
          referredBy: input?.quem_indicou ?? "",
        },
        eventDate: availability.data,
        eventTime: input?.horario ?? "",
        venue: input?.local ?? "",
        city: input?.cidade ?? "",
        serviceIds: Array.isArray(input?.servicos) ? input.servicos : [],
        notes,
      };

      let orderId: number;
      if (existingId) {
        await gestor.updateOrder(existingId, payload, "margot");
        orderId = existingId;
      } else {
        orderId = (await gestor.createOrder(payload, "margot")).order.id;
      }
      const { totais, order } = await gestor.createQuote(orderId, { serviceIds: payload.serviceIds }, "margot");
      state.orderId = orderId;
      const items = order.quotes[0]?.items ?? [];
      return {
        pedido: orderId,
        servicos: items.map((i) => `${i.name} (${formatBRL(i.priceCents)})`),
        total: formatBRL(totais.totalCents),
        sinal: formatBRL(totais.depositCents),
        saldo: formatBRL(totais.balanceCents),
        proximo_passo: "Falar com o Leonardo no WhatsApp para pagar o sinal e garantir a data.",
      };
    }

    if (name === "encaminhar_para_leonardo") {
      state.encaminhado = true;
      const motivo = String(input?.motivo ?? "").slice(0, 500);
      if (state.orderId) {
        const order = await prisma.order.findUnique({ where: { id: state.orderId }, select: { notes: true } });
        await prisma.order.update({
          where: { id: state.orderId },
          data: { notes: `${order?.notes ?? ""}\n[Margot pediu sua ajuda] ${motivo}`.trim() },
        });
      }
      return { ok: true, instrucao: "Diga que o Leonardo responde pessoalmente pelo WhatsApp (botão abaixo da conversa)." };
    }

    return { erro: `Ferramenta desconhecida: ${name}` };
  } catch (e) {
    if (e instanceof RuleError) return { erro: e.message };
    console.error(`[margot] ferramenta ${name}`, e);
    return { erro: "Falha interna ao consultar o sistema. Encaminhe para o Leonardo." };
  }
}

/** Reaproveita o pedido desta conversa, ou um pedido recente em aberto do mesmo WhatsApp. */
async function findOrderToUpdate(orderId: number | null, phone: string): Promise<number | null> {
  const editable = ["novo", "orcamento_enviado", "aguardando_resposta"];
  if (orderId) {
    const o = await prisma.order.findUnique({ where: { id: orderId }, include: { client: true } });
    if (o && editable.includes(o.status) && o.client.phone === phone) return o.id;
  }
  const recent = await prisma.order.findFirst({
    where: {
      client: { phone },
      status: { in: editable },
      createdAt: { gte: new Date(Date.now() - 3 * 86_400_000) },
    },
    orderBy: { createdAt: "desc" },
  });
  return recent?.id ?? null;
}

async function callClaude(system: string, messages: unknown[]) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env["ANTHROPIC_API_KEY"]!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 800, system, tools: TOOLS, messages }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as {
    stop_reason: string;
    content: ({ type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: unknown })[];
  };
}

export async function chat(history: ChatMessage[], orderId: number | null): Promise<ChatResult> {
  const [services, settings] = await Promise.all([gestor.listServices({ activeOnly: true }), gestor.getSettings()]);
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: TIMEZONE }).format(now);
  const system = buildSystemPrompt({ today: todayISO(now), weekday, services, settings, orderId });

  const state: ToolState = { orderId, encaminhado: false };
  const messages: any[] = history.map((m) => ({ role: m.role, content: m.content }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callClaude(system, messages);
    const toolUses = response.content.filter((b) => b.type === "tool_use") as {
      id: string;
      name: string;
      input: unknown;
    }[];

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      const reply = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("\n")
        .trim();
      return { reply: reply || "Desculpe, pode repetir?", orderId: state.orderId, encaminhado: state.encaminhado };
    }

    messages.push({ role: "assistant", content: response.content });
    const results = [];
    for (const use of toolUses) {
      const output = await runTool(use.name, use.input, state);
      results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(output) });
    }
    messages.push({ role: "user", content: results });
  }

  return {
    reply: "Vou pedir para o Leonardo continuar com você pelo WhatsApp, tudo bem? É só tocar no botão abaixo.",
    orderId: state.orderId,
    encaminhado: true,
  };
}
