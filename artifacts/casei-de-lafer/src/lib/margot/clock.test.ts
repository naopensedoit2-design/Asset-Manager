import { test } from "node:test";
import assert from "node:assert/strict";
import { dateFacts, nowStamp, stampLastUserTurn, weekdayOf } from "./clock.ts";
import { runAgent } from "./claude.ts";

// Referência: 28/10/2026 é quarta-feira (data da auditoria). 17:35 UTC = 14:35 em Brasília (UTC-3, sem horário de verão).
const QUARTA_14H35 = new Date("2026-10-28T17:35:00Z");

test("carimbo mostra dia da semana, data e hora de Brasília", () => {
  assert.equal(nowStamp(QUARTA_14H35), "[Agora: quarta-feira, 28/10/2026, 14:35 (horário de Brasília)]");
});

test("carimbo usa o dia de Brasília, não o de UTC (23h30 de quarta ainda é quarta)", () => {
  // 02:30 UTC de quinta = 23:30 de quarta em Brasília
  assert.equal(nowStamp(new Date("2026-10-29T02:30:00Z")), "[Agora: quarta-feira, 28/10/2026, 23:30 (horário de Brasília)]");
  // virada de domingo para segunda
  assert.equal(nowStamp(new Date("2026-10-26T02:59:00Z")), "[Agora: domingo, 25/10/2026, 23:59 (horário de Brasília)]");
});

test("meia-noite aparece como 00:00, nunca 24:00", () => {
  assert.equal(nowStamp(new Date("2026-10-28T03:00:00Z")), "[Agora: quarta-feira, 28/10/2026, 00:00 (horário de Brasília)]");
});

test("dia da semana de qualquer data, inclusive ano bissexto", () => {
  assert.equal(weekdayOf("2026-10-28"), "quarta-feira");
  assert.equal(weekdayOf("2026-12-19"), "sábado");
  assert.equal(weekdayOf("2026-12-25"), "sexta-feira");
  assert.equal(weekdayOf("2027-01-01"), "sexta-feira");
  assert.equal(weekdayOf("2028-02-29"), "terça-feira");
});

test("fatos da data: dia da semana, dias que faltam e linguagem natural", () => {
  assert.deepEqual(dateFacts("2026-12-19", QUARTA_14H35), { dia_da_semana: "sábado", dias_ate_a_data: 52, quando: "daqui a 52 dias" });
  assert.equal(dateFacts("2026-10-28", QUARTA_14H35)?.quando, "hoje");
  assert.equal(dateFacts("2026-10-29", QUARTA_14H35)?.quando, "amanhã");
  assert.equal(dateFacts("2026-10-27", QUARTA_14H35)?.quando, "ontem");
  assert.deepEqual(dateFacts("2026-10-20", QUARTA_14H35), { dia_da_semana: "terça-feira", dias_ate_a_data: -8, quando: "há 8 dias" });
});

test("fatos da data: às 23h30 de quarta, quinta ainda é amanhã", () => {
  const tarde = new Date("2026-10-29T02:30:00Z");
  assert.equal(dateFacts("2026-10-29", tarde)?.quando, "amanhã");
  assert.equal(dateFacts("2026-10-28", tarde)?.quando, "hoje");
});

test("fatos da data: data inválida não vira número", () => {
  assert.equal(dateFacts("2026-02-30", QUARTA_14H35), null);
  assert.equal(dateFacts("amanhã", QUARTA_14H35), null);
  assert.equal(dateFacts("", QUARTA_14H35), null);
});

const STAMP = "[Agora: quarta-feira, 28/10/2026, 14:35 (horário de Brasília)]";

test("carimbo vai só na última fala da pessoa e não altera a lista original", () => {
  const original = [
    { role: "user", content: "oi" },
    { role: "assistant", content: "Bom dia! Resumo de domingo 25/10..." },
    { role: "user", content: "que dia é hoje?" },
  ];
  const copy = JSON.parse(JSON.stringify(original));
  const out = stampLastUserTurn(original, QUARTA_14H35);
  assert.deepEqual(original, copy);
  assert.equal(out[0].content, "oi");
  assert.equal(out[1].content, original[1].content);
  assert.equal(out[2].content, `${STAMP}\nque dia é hoje?`);
});

test("carimbo entra como bloco de texto quando a fala tem imagem ou PDF", () => {
  const out = stampLastUserTurn(
    [{ role: "user", content: [{ type: "text", text: "comprovante" }, { type: "image", source: { type: "base64" } }] }],
    QUARTA_14H35,
  );
  const content = out[0].content as { type: string; text?: string }[];
  assert.deepEqual(content[0], { type: "text", text: STAMP });
  assert.deepEqual(content[1], { type: "text", text: "comprovante" });
  assert.equal(content[2].type, "image");
});

test("resultados de ferramentas não recebem carimbo: ele fica na fala da pessoa", () => {
  const out = stampLastUserTurn(
    [
      { role: "user", content: "essa data está livre?" },
      { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "verificar_data", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "{}" }] },
    ],
    QUARTA_14H35,
  );
  assert.equal(out[0].content, `${STAMP}\nessa data está livre?`);
  assert.deepEqual(out[2].content, [{ type: "tool_result", tool_use_id: "t1", content: "{}" }]);
});

test("sem fala da pessoa, nada muda", () => {
  const msgs = [{ role: "assistant", content: "x" }];
  assert.equal(stampLastUserTurn(msgs, QUARTA_14H35), msgs);
  assert.deepEqual(stampLastUserTurn([], QUARTA_14H35), []);
});

test("runAgent manda o carimbo do servidor uma vez, também depois de uma rodada de ferramenta", async () => {
  const sent: { messages: { role: string; content: unknown }[] }[] = [];
  const realFetch = globalThis.fetch;
  const realKey = process.env["ANTHROPIC_API_KEY"];
  process.env["ANTHROPIC_API_KEY"] = "chave-de-teste";
  let call = 0;
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    sent.push(JSON.parse(init.body));
    call++;
    const body =
      call === 1
        ? { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "verificar_data", input: { data: "2026-12-19" } }], usage: {} }
        : { stop_reason: "end_turn", content: [{ type: "text", text: "pronto" }], usage: {} };
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
  const input = [{ role: "user", content: "que dia é hoje?" }];
  try {
    const result = await runAgent({
      system: "instruções",
      tools: [],
      messages: input,
      runTool: async () => ({ ok: true }),
      usage: [],
      now: QUARTA_14H35,
    });
    assert.equal(result.text, "pronto");
    assert.equal(sent.length, 2);
    assert.equal(sent[0].messages[0].content, `${STAMP}\nque dia é hoje?`);
    // na segunda chamada o histórico segue igual e o carimbo não se repete nos resultados da ferramenta
    assert.equal(JSON.stringify(sent[1].messages).split("[Agora:").length - 1, 1);
    assert.equal((sent[1].messages[2].content as { type: string }[])[0].type, "tool_result");
    assert.equal(input[0].content, "que dia é hoje?"); // lista de quem chamou não foi alterada
  } finally {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env["ANTHROPIC_API_KEY"];
    else process.env["ANTHROPIC_API_KEY"] = realKey;
  }
});
