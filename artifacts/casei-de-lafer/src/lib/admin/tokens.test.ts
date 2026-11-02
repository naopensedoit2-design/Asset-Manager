// Guarda do visual: as telas do painel só usam as cores do tema (text-gold, text-ok, bg-bg-card…), nunca cores
// fixas. Uma cor fixa (um verde "text-emerald-300" ou um "#C9A84C") fica ilegível em algum dos 4 temas ou das 6
// cores de destaque. O contraste das cores do tema é conferido em look.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const pacote = fileURLToPath(new URL("../../../", import.meta.url));
const PASTAS = ["app/admin", "src/components/admin", "src/components/gestor"];

function arquivosTsx(dir: string): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...arquivosTsx(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const PALETA =
  /\b(?:text|bg|border|ring|fill|stroke|from|via|to|outline|divide|placeholder|accent|decoration|caret|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)-\d{2,3}\b/;
const HEXADECIMAL = /#[0-9a-fA-F]{3,8}\b/;
const COR_FIXA = /\b(?:rgba?|hsla?)\(\s*\d/;

test("as telas do painel não usam cores fixas: só as cores do tema", () => {
  const achados: string[] = [];
  for (const pasta of PASTAS) {
    for (const arquivo of arquivosTsx(join(pacote, pasta))) {
      readFileSync(arquivo, "utf8")
        .split("\n")
        .forEach((linha, i) => {
          for (const [nome, regra] of [["cor de paleta", PALETA], ["cor em hexadecimal", HEXADECIMAL], ["cor rgb/hsl fixa", COR_FIXA]] as const) {
            const m = regra.exec(linha);
            if (m) achados.push(`${relative(pacote, arquivo)}:${i + 1} ${nome}: ${m[0]}`);
          }
        });
    }
  }
  assert.deepEqual(achados, [], `\nUse as classes do tema (text-gold, text-ok, text-bad, bg-bg-card…):\n${achados.join("\n")}`);
});
