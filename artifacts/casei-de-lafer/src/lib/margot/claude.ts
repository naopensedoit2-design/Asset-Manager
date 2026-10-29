// Conversa com a API do Claude (via fetch, sem SDK) e roda o ciclo de ferramentas.
// Usado pela Margot no site, pela Margot no WhatsApp e pelo modo secretária.

import { stampLastUserTurn } from "./clock.ts";
import type { CallUsage } from "./usage";

const API_URL = () => `${process.env["ANTHROPIC_BASE_URL"] ?? "https://api.anthropic.com"}/v1/messages`;
export const MODEL = () => process.env["MARGOT_MODEL"] || "claude-sonnet-5-5";

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type SystemBlock = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: string; [k: string]: unknown };

interface ClaudeResponse {
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  stop_reason: string;
  content: Block[];
}

/**
 * Instruções em dois blocos: a parte fixa (igual para todas as conversas) fica marcada para o cache,
 * e a parte que muda (data de hoje, pedido da conversa) vem depois.
 */
export function systemBlocks(fixed: string, variable: string): SystemBlock[] {
  const blocks: SystemBlock[] = [{ type: "text", text: fixed, cache_control: { type: "ephemeral" } }];
  if (variable.trim()) blocks.push({ type: "text", text: variable });
  return blocks;
}

/** Se a API recusar o cache (conta ou plataforma sem suporte), segue sem ele em vez de parar a Margot. */
let cacheRejected = false;

function plainSystem(system: string | SystemBlock[]): string | SystemBlock[] {
  return typeof system === "string" ? system : system.map(({ type, text }) => ({ type, text }));
}

async function callClaude(system: string | SystemBlock[], tools: ToolDef[], messages: unknown[], maxTokens: number) {
  const send = (withCache: boolean) =>
    fetch(API_URL(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env["ANTHROPIC_API_KEY"]!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL(),
        max_tokens: maxTokens,
        // Cache automático: o começo da conversa que se repete entre chamadas custa ~5% do preço.
        ...(withCache ? { cache_control: { type: "ephemeral" } } : {}),
        system: withCache ? system : plainSystem(system),
        tools,
        messages,
      }),
    });

  let res = await send(!cacheRejected);
  if (res.status === 400 && !cacheRejected) {
    const detail = await res.clone().text().catch(() => "");
    if (detail.includes("cache_control")) {
      cacheRejected = true;
      console.error("[margot] API recusou o cache de prompt; seguindo sem cache", detail.slice(0, 200));
      res = await send(false);
    }
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as ClaudeResponse;
}

export interface AgentRun {
  system: string | SystemBlock[];
  tools: ToolDef[];
  /** Mensagens no formato da API (o conteúdo pode ter texto, imagens e PDFs). */
  messages: unknown[];
  runTool: (name: string, input: any) => Promise<unknown>;
  usage: CallUsage[];
  maxRounds?: number;
  maxTokens?: number;
  /** Relógio usado no carimbo de data e hora (só os testes passam este valor). */
  now?: Date;
}

export interface AgentResult {
  text: string;
  /** true quando o modelo ainda queria usar ferramentas e o limite de rodadas acabou. */
  exhausted: boolean;
}

export async function runAgent(run: AgentRun): Promise<AgentResult> {
  // Data e hora do servidor na última fala da pessoa: o modelo não tem relógio e, sem isso,
  // pode se apoiar em datas de mensagens antigas da conversa (ex.: o resumo de dias atrás).
  const messages = stampLastUserTurn([...run.messages] as { role: string; content: unknown }[], run.now);
  const maxRounds = run.maxRounds ?? 6;
  for (let round = 0; round < maxRounds; round++) {
    const response = await callClaude(run.system, run.tools, messages, run.maxTokens ?? 800);
    const u = response.usage ?? {};
    run.usage.push({
      model: MODEL(),
      inputTokens: u.input_tokens ?? 0,
      outputTokens: u.output_tokens ?? 0,
      cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
    });
    const toolUses = response.content.filter((b) => b.type === "tool_use") as { id: string; name: string; input: unknown }[];
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("\n")
        .trim();
      return { text, exhausted: false };
    }
    messages.push({ role: "assistant", content: response.content });
    const results = [];
    for (const use of toolUses) {
      const output = await run.runTool(use.name, use.input);
      results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(output) });
    }
    messages.push({ role: "user", content: results });
  }
  return { text: "", exhausted: true };
}
