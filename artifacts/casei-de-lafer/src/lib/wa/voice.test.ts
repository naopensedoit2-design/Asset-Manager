import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { speechReady, transcribe, transcriptionProviders, voiceReady } from "./voice.ts";

// Transcrição com reserva: o provedor principal falha (crédito acabou, limite, fora do ar) e a reserva assume.
// Nenhuma chamada de rede de verdade: o fetch é trocado por um falso em cada teste.

const KEYS = ["VOICE_API_KEY", "VOICE_API_BASE", "TRANSCRIBE_MODEL", "VOICE_FALLBACK_API_KEY", "VOICE_FALLBACK_API_BASE", "VOICE_FALLBACK_TRANSCRIBE_MODEL"];
const realFetch = globalThis.fetch;
const realWarn = console.warn;

function setEnv(env: Record<string, string>) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
}
afterEach(() => {
  for (const k of KEYS) delete process.env[k];
  globalThis.fetch = realFetch;
  console.warn = realWarn;
});

interface Call {
  url: string;
  auth: string;
  model: string;
}
function fakeFetch(answers: Record<string, { status: number; body: unknown }>): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const host = String(url);
    const model = String((init?.body as FormData).get("model"));
    calls.push({ url: host, auth: String((init?.headers as Record<string, string>).Authorization), model });
    const a = Object.entries(answers).find(([k]) => host.includes(k))?.[1] ?? { status: 500, body: "sem resposta" };
    return new Response(typeof a.body === "string" ? a.body : JSON.stringify(a.body), { status: a.status });
  }) as typeof fetch;
  return calls;
}
const audio = Buffer.from("fake");

test("sem nenhuma chave, a Margot não ouve nem fala, e transcribe avisa", async () => {
  setEnv({});
  assert.equal(voiceReady(), false);
  assert.equal(speechReady(), false);
  await assert.rejects(transcribe(audio, "audio/ogg"), /não configurada/);
});

test("só o provedor principal: ouve e fala; a ordem e o modelo são os da OpenAI", () => {
  setEnv({ VOICE_API_KEY: "k1" });
  assert.equal(voiceReady(), true);
  assert.equal(speechReady(), true);
  const [p, ...rest] = transcriptionProviders();
  assert.equal(p.name, "principal");
  assert.equal(p.base, "https://api.openai.com/v1");
  assert.equal(p.model, "gpt-4o-mini-transcribe");
  assert.equal(rest.length, 0);
});

test("a reserva tem endereço e modelo da Groq por padrão, e pode ser trocada", () => {
  setEnv({ VOICE_API_KEY: "k1", VOICE_FALLBACK_API_KEY: "k2" });
  const [, r] = transcriptionProviders();
  assert.equal(r.name, "reserva");
  assert.equal(r.base, "https://api.groq.com/openai/v1");
  assert.equal(r.model, "whisper-large-v3-turbo");
  setEnv({ VOICE_API_KEY: "k1", VOICE_FALLBACK_API_KEY: "k2", VOICE_FALLBACK_API_BASE: "https://outra.example/v1/", VOICE_FALLBACK_TRANSCRIBE_MODEL: "m" });
  const [, r2] = transcriptionProviders();
  assert.equal(r2.base, "https://outra.example/v1");
  assert.equal(r2.model, "m");
});

test("principal funcionando: a reserva nem é chamada", async () => {
  setEnv({ VOICE_API_KEY: "k1", VOICE_FALLBACK_API_KEY: "k2" });
  const calls = fakeFetch({ "api.openai.com": { status: 200, body: { text: " Oi, Margot. " } } });
  assert.equal(await transcribe(audio, "audio/ogg; codecs=opus"), "Oi, Margot.");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.openai\.com\/v1\/audio\/transcriptions$/);
  assert.equal(calls[0].auth, "Bearer k1");
});

test("acabou o crédito do principal (429): a reserva transcreve e o aviso não vaza a chave", async () => {
  setEnv({ VOICE_API_KEY: "chave-principal", VOICE_FALLBACK_API_KEY: "chave-reserva" });
  const calls = fakeFetch({
    "api.openai.com": { status: 429, body: { error: { code: "insufficient_quota" } } },
    "api.groq.com": { status: 200, body: { text: "Quais conversas esperam resposta?" } },
  });
  const warns: string[] = [];
  console.warn = (m: string) => warns.push(String(m));
  assert.equal(await transcribe(audio, "audio/ogg"), "Quais conversas esperam resposta?");
  assert.deepEqual(calls.map((c) => c.model), ["gpt-4o-mini-transcribe", "whisper-large-v3-turbo"]);
  assert.equal(calls[1].auth, "Bearer chave-reserva");
  assert.match(warns.join(), /reserva/);
  assert.match(warns.join(), /429/);
  assert.doesNotMatch(warns.join(), /chave-/);
});

test("só a reserva configurada: ouve, mas não fala", async () => {
  setEnv({ VOICE_FALLBACK_API_KEY: "k2" });
  assert.equal(voiceReady(), true);
  assert.equal(speechReady(), false);
  fakeFetch({ "api.groq.com": { status: 200, body: { text: "ok" } } });
  assert.equal(await transcribe(audio, "audio/ogg"), "ok");
});

test("os dois falham: o erro diz o que aconteceu em cada um, sem chave", async () => {
  setEnv({ VOICE_API_KEY: "chave-principal", VOICE_FALLBACK_API_KEY: "chave-reserva" });
  fakeFetch({ "api.openai.com": { status: 429, body: "sem crédito" }, "api.groq.com": { status: 503, body: "fora do ar" } });
  await assert.rejects(transcribe(audio, "audio/ogg"), (e: Error) => {
    assert.match(e.message, /principal: HTTP 429/);
    assert.match(e.message, /reserva: HTTP 503/);
    assert.doesNotMatch(e.message, /chave-/);
    return true;
  });
});
