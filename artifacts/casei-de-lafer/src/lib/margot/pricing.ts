// Preços oficiais por milhão de tokens (US$), conferidos em platform.claude.com/docs/en/about-claude/pricing
// e na página de prompt caching. Gravar no cache custa 1,25× a entrada; ler do cache custa 0,05× no
// Sonnet/Opus 5.5 e 0,1× no Haiku 5.5.
const PRICES: Record<string, { input: number; output: number; inputLong?: number; outputLong?: number; cacheRead: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.05 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.05 },
  // Haiku tem preço maior acima de 100 mil tokens de entrada por chamada.
  "claude-haiku-5-5": { input: 0.1, output: 0.5, inputLong: 0.5, outputLong: 2.5, cacheRead: 0.1 },
};

const CACHE_WRITE = 1.25;

/**
 * Custo de uma chamada em milionésimos de dólar. Modelo desconhecido usa o preço do Sonnet (conservador).
 * inputTokens é só a parte que não veio nem foi para o cache (como a API informa).
 */
export function costMicroUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheWriteTokens = 0,
  cacheReadTokens = 0,
): number {
  const p = PRICES[model] ?? PRICES["claude-sonnet-5-5"];
  const promptSize = inputTokens + cacheWriteTokens + cacheReadTokens;
  const long = promptSize > 100_000 && p.inputLong !== undefined;
  const inRate = long ? p.inputLong! : p.input;
  const outRate = long ? p.outputLong! : p.output;
  // tokens × (US$ por milhão) = milionésimos de dólar
  return Math.round(
    inputTokens * inRate + cacheWriteTokens * inRate * CACHE_WRITE + cacheReadTokens * inRate * p.cacheRead + outputTokens * outRate,
  );
}
