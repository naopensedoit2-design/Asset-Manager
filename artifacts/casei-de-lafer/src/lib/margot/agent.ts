// A Margot no chat do site. Conversa via API do Claude e usa ferramentas que leem e
// escrevem no mesmo banco do painel /admin. A versão do WhatsApp fica em src/lib/wa/customer.ts.

import * as gestor from "@/lib/gestor/service";
import { normalizePhone, TIMEZONE, todayISO } from "@/lib/gestor/rules";
import { phoneVariants } from "@/lib/wa/phone";
import { linkButtonMessage } from "@/lib/wa/client";
import { notifyOwner } from "@/lib/wa/notify";
import { runAgent, systemBlocks, type ToolDef } from "./claude";
import { appendOrderNote, checkDate, registerOrder, toolError } from "./orders";
import { buildSystemPrompt } from "./prompt";
import type { CallUsage } from "./usage";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  reply: string;
  orderId: number | null;
  encaminhado: boolean;
  usage: CallUsage[];
}

export const DATE_TOOL: ToolDef = {
  name: "verificar_data",
  description: "Confere se uma data está livre na agenda do carro. Use sempre antes de falar sobre disponibilidade.",
  input_schema: {
    type: "object",
    properties: { data: { type: "string", description: "Data no formato AAAA-MM-DD" } },
    required: ["data"],
  },
};

/** Campos do pedido comuns ao site e ao WhatsApp. */
export const ORDER_FIELDS = {
  nome: { type: "string", description: "Nome de quem está pedindo (noiva, noivo ou cerimonialista)" },
  data: { type: "string", description: "Data do casamento ou do ensaio, AAAA-MM-DD" },
  horario: { type: "string", description: "Horário aproximado, HH:MM" },
  local: { type: "string", description: "Local da cerimônia (ou região das fotos, no ensaio)" },
  cidade: { type: "string" },
  servicos: { type: "array", items: { type: "integer" }, description: "ids dos serviços escolhidos" },
  origem: {
    type: "string",
    enum: ["instagram", "indicacao", "site", "cerimonialista", "outro"],
    description: "Como conheceu, se a pessoa disser",
  },
  quem_indicou: { type: "string" },
  resumo: { type: "string", description: "Resumo do que importa na conversa, para o Leonardo ler" },
};

const TOOLS: ToolDef[] = [
  DATE_TOOL,
  {
    name: "registrar_pedido",
    description:
      "Registra (ou atualiza) o pedido e calcula o orçamento com os preços atuais. Use quando tiver data livre, nome, WhatsApp e serviços. Devolve total, sinal e saldo.",
    input_schema: {
      type: "object",
      properties: { ...ORDER_FIELDS, whatsapp: { type: "string", description: "WhatsApp com DDD" } },
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

/** Aviso no WhatsApp do Leonardo (se configurado). Nunca atrapalha a conversa do site. */
async function notifyOwnerSafe(text: string, summary: string, orderId: number | null) {
  try {
    const link = orderId && gestor.siteUrl() ? `${gestor.siteUrl()}/admin/pedidos/${orderId}` : "";
    await notifyOwner({ text, summary, build: link ? () => linkButtonMessage(text, "Abrir pedido", link) : undefined });
  } catch (e) {
    console.error("[margot] aviso ao Leonardo", e);
  }
}

interface ToolState {
  orderId: number | null;
  encaminhado: boolean;
}

async function runTool(name: string, input: any, state: ToolState): Promise<unknown> {
  try {
    if (name === "verificar_data") return await checkDate(input?.data);

    if (name === "registrar_pedido") {
      const phone = normalizePhone(String(input?.whatsapp ?? ""));
      const r = await registerOrder({
        input,
        phone,
        phoneVariants: phoneVariants(phone),
        currentOrderId: state.orderId,
        channelNote: "Pedido feito pelo chat do site com a Margot.",
      });
      if ("erro" in r) return r;
      state.orderId = r.orderId;
      if (r.created) {
        const o = r.order;
        await notifyOwnerSafe(
          `🆕 Novo pedido pelo chat do site\n${o.client.name} · ${r.resultado.data}${o.city ? ` · ${o.city}` : ""}\n${r.resultado.servicos.join(" + ")}\nTotal ${r.resultado.total}.`,
          `novo pedido pelo site de ${o.client.name} para ${r.resultado.data}, total ${r.resultado.total}`,
          r.orderId,
        );
      }
      return {
        ...r.resultado,
        proximo_passo: "Falar com o Leonardo no WhatsApp para pagar o sinal e garantir a data.",
      };
    }

    if (name === "encaminhar_para_leonardo") {
      state.encaminhado = true;
      const motivo = String(input?.motivo ?? "").slice(0, 500);
      await appendOrderNote(state.orderId, `[Margot pediu sua ajuda] ${motivo}`);
      await notifyOwnerSafe(
        `🙋 Chat do site${state.orderId ? ` (pedido #${state.orderId})` : ""}: ${motivo}\nA pessoa vai te chamar no WhatsApp.`,
        `chat do site: ${motivo}`,
        state.orderId,
      );
      return { ok: true, instrucao: "Diga que o Leonardo responde pessoalmente pelo WhatsApp (botão abaixo da conversa)." };
    }

    return { erro: `Ferramenta desconhecida: ${name}` };
  } catch (e) {
    return toolError(e, name);
  }
}

export async function chat(
  history: ChatMessage[],
  orderId: number | null,
  usage: CallUsage[] = [],
): Promise<ChatResult> {
  const [services, settings] = await Promise.all([gestor.listServices({ activeOnly: true }), gestor.getSettings()]);
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: TIMEZONE }).format(now);
  const prompt = buildSystemPrompt({ channel: "site", today: todayISO(now), weekday, services, settings, orderId });

  const state: ToolState = { orderId, encaminhado: false };
  const result = await runAgent({
    system: systemBlocks(prompt.fixed, prompt.variable),
    tools: TOOLS,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
    runTool: (name, input) => runTool(name, input, state),
    usage,
  });

  if (result.exhausted) {
    return {
      reply: "Vou pedir para o Leonardo continuar com você pelo WhatsApp, tudo bem? É só tocar no botão abaixo.",
      orderId: state.orderId,
      encaminhado: true,
      usage,
    };
  }
  return { reply: result.text || "Desculpe, pode repetir?", orderId: state.orderId, encaminhado: state.encaminhado, usage };
}
