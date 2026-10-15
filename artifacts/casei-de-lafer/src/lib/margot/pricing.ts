// Preços oficiais por milhão de tokens (US$), conferidos em platform.claude.com/docs/en/about-claude/pricing.
const PRICES: Record<string, { input: number; output: number; inputLong?: number; outputLong?: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  // Haiku tem preço maior acima de 100 mil tokens de entrada por chamada.
  "claude-haiku-5-5": { input: 0.1, output: 0.5, inputLong: 0.5, outputLong: 2.5 },
};

/** Custo de uma chamada em milionésimos de dólar. Modelo desconhecido usa o preço do Sonnet (conservador). */
export function costMicroUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICES[model] ?? PRICES["claude-sonnet-5-5"];
  const long = inputTokens > 100_000 && p.inputLong !== undefined;
  const inRate = long ? p.inputLong! : p.input;
  const outRate = long ? p.outputLong! : p.output;
  // tokens × (US$ por milhão) = milionésimos de dólar
  return Math.round(inputTokens * inRate + outputTokens * outRate);
}

