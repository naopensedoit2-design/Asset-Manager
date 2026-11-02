// A Margot não diz o nome do dono para clientes: ela fala "nossa equipe".
// O prompt é testado direto; os textos fixos (respostas de erro, avisos, página do orçamento) são lidos do código,
// porque ficam espalhados por vários arquivos e um texto novo poderia trazer o nome de volta sem ninguém ver.
// O nome continua valendo onde é necessário: Termo (parte do contrato), política de privacidade (LGPD),
// favorecido do Pix e tudo que é dito ao próprio dono (modo secretária, avisos, painel).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSystemPrompt, type PromptContext } from "./prompt.ts";
import { DEFAULT_SETTINGS } from "../gestor/rules.ts";

const pacote = fileURLToPath(new URL("../../../", import.meta.url));

const ctx = (channel: "site" | "whatsapp"): PromptContext => ({
  channel,
  today: "2026-11-01",
  weekday: "domingo",
  services: [{ id: 1, name: "Carro da Noiva", description: "Chegada da noiva.", priceCents: 260000, isAddon: false }],
  settings: DEFAULT_SETTINGS,
  orderId: null,
  conversation: "Primeiro contato: sim.",
});

test("o prompt dos dois canais não traz o nome do dono e traz a regra de falar \"nossa equipe\"", () => {
  for (const channel of ["site", "whatsapp"] as const) {
    const { fixed, variable } = buildSystemPrompt(ctx(channel));
    assert.ok(!/leonardo/i.test(fixed), `${channel}: o prompt fixo cita o nome do dono (nem nos nomes das ferramentas)`);
    assert.ok(!/leonardo/i.test(variable), `${channel}: o prompt variável cita o nome do dono`);
    assert.ok(fixed.includes("Nunca diga o nome do dono"), `${channel}: falta a regra`);
    assert.ok(fixed.includes("Única exceção: o nome do favorecido"), `${channel}: falta a exceção do Pix`);
    assert.ok(fixed.includes("a nossa equipe"), channel);
  }
});

// Arquivos cujo texto chega ao cliente (direto ou pela boca da Margot).
const ARQUIVOS_DO_CLIENTE = [
  "src/lib/margot/prompt.ts",
  "src/lib/margot/agent.ts",
  "src/lib/margot/orders.ts",
  "src/lib/wa/customer.ts",
  "src/lib/wa/history.ts",
  "app/api/margot/route.ts",
  "app/orcamento/detalhado/page.tsx",
];

test("nos arquivos que falam com o cliente, o nome do dono só aparece em comentário ou em log do servidor", () => {
  const achados: string[] = [];
  for (const arquivo of ARQUIVOS_DO_CLIENTE) {
    readFileSync(join(pacote, arquivo), "utf8")
      .split("\n")
      .forEach((linha, i) => {
        if (!/Leonardo/.test(linha)) return;
        const t = linha.trim();
        if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("*")) return; // comentário
        if (/\bconsole\.(error|warn|log)\(/.test(t)) return; // log: o cliente não vê
        achados.push(`${arquivo}:${i + 1}: ${t.slice(0, 110)}`);
      });
  }
  assert.deepEqual(achados, [], `texto para cliente com o nome do dono (troque por "nossa equipe"):\n${achados.join("\n")}`);
});
