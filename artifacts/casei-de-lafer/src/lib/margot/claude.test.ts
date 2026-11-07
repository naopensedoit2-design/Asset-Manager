import { test } from "node:test";
import assert from "node:assert/strict";
import { runAgent } from "./claude.ts";

/** Responde às chamadas ao Claude com as respostas dadas, em ordem. */
async function comRespostas(respostas: object[], fn: () => Promise<void>) {
  const realFetch = globalThis.fetch;
  const realKey = process.env["ANTHROPIC_API_KEY"];
  process.env["ANTHROPIC_API_KEY"] = "chave-de-teste";
  let call = 0;
  globalThis.fetch = (async () => new Response(JSON.stringify({ usage: {}, ...respostas[call++] }), { status: 200 })) as unknown as typeof fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env["ANTHROPIC_API_KEY"];
    else process.env["ANTHROPIC_API_KEY"] = realKey;
  }
}

const run = () =>
  runAgent({
    system: "instruções",
    tools: [],
    messages: [{ role: "user", content: "oi" }],
    runTool: async () => ({ ok: true }),
    usage: [],
  });

const chamaFerramenta = (texto?: string) => ({
  stop_reason: "tool_use",
  content: [...(texto ? [{ type: "text", text: texto }] : []), { type: "tool_use", id: "t1", name: "marcar_engano", input: {} }],
});

test("última rodada sem texto: a pessoa recebe o que o modelo disse antes da ferramenta", async () => {
  await comRespostas([chamaFerramenta("Este é o WhatsApp da Eu Casei de Lafer. Tenha um bom dia!"), { stop_reason: "end_turn", content: [] }], async () => {
    const r = await run();
    assert.equal(r.text, "Este é o WhatsApp da Eu Casei de Lafer. Tenha um bom dia!");
    assert.equal(r.exhausted, false);
  });
});

test("última rodada com texto: vale o texto dela, não o de antes da ferramenta", async () => {
  await comRespostas([chamaFerramenta("Vou conferir a data."), { stop_reason: "end_turn", content: [{ type: "text", text: "A data está livre." }] }], async () => {
    assert.equal((await run()).text, "A data está livre.");
  });
});

test("nada escrito em rodada nenhuma: volta vazio e quem chamou decide o que fazer", async () => {
  await comRespostas([chamaFerramenta(), { stop_reason: "end_turn", content: [] }], async () => {
    const r = await run();
    assert.equal(r.text, "");
    assert.equal(r.exhausted, false);
  });
});

test("resposta direta, sem ferramenta, continua igual", async () => {
  await comRespostas([{ stop_reason: "end_turn", content: [{ type: "text", text: "Olá!" }] }], async () => {
    assert.equal((await run()).text, "Olá!");
  });
});
