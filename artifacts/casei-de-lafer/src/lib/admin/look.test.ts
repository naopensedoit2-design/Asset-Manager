import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { blend, contrast } from "./contrast.ts";
import { ACCENTS, DEFAULT_LOOK, LOOK_STORAGE_KEY, THEMES, parseLook, prePaintScript, resolveTheme } from "./look.ts";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const themeCss = read("../../../app/admin/theme.css");
const globalsCss = read("../../../app/globals.css");

// ─── Leitura do CSS ──────────────────────────────────────────

type Rule = { attr: "theme" | "accent"; key: string; decls: Record<string, string> };

function parseDecls(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim().replace(/\s+/g, " ");
  return out;
}

/** Regras `html[data-admin-theme="x"], html[data-admin-accent="y"] { ... }`, na ordem do arquivo. */
function parseRules(css: string): Rule[] {
  const rules: Rule[] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(/((?:html\[data-admin-(?:theme|accent)="[\w]+"\]\s*,?\s*)+)\{([^}]*)\}/g)) {
    const decls = parseDecls(m[2]);
    for (const s of m[1].matchAll(/html\[data-admin-(theme|accent)="(\w+)"\]/g)) {
      rules.push({ attr: s[1] as Rule["attr"], key: s[2], decls });
    }
  }
  return rules;
}

const rules = parseRules(themeCss);
const rootDefaults = parseDecls(/:root\s*\{([^}]*)\}/.exec(globalsCss)![1]);

/** Variáveis finais de uma combinação tema + destaque (cascata simples + var()). */
function resolved(theme: string, accent: string): Record<string, string> {
  const vars: Record<string, string> = { ...rootDefaults };
  for (const r of rules) {
    if ((r.attr === "theme" && r.key === theme) || (r.attr === "accent" && r.key === accent)) Object.assign(vars, r.decls);
  }
  const get = (name: string, depth = 0): string => {
    const raw = vars[name];
    assert.ok(raw !== undefined, `variável ${name} não definida em ${theme}/${accent}`);
    const ref = /^var\((--[\w-]+)\)$/.exec(raw);
    if (ref) {
      assert.ok(depth < 6, `referência circular em ${name}`);
      return get(ref[1], depth + 1);
    }
    return raw;
  };
  return new Proxy({}, { get: (_t, p) => get(String(p)) }) as Record<string, string>;
}

// ─── Aparência salva ─────────────────────────────────────────

test("parseLook: valores válidos passam e lixo volta ao padrão", () => {
  assert.deepEqual(parseLook(JSON.stringify({ theme: "perola", accent: "bordo", size: "lg" })), { theme: "perola", accent: "bordo", size: "lg" });
  assert.deepEqual(parseLook({ theme: "auto", accent: "cobre", size: "xl" }), { theme: "auto", accent: "cobre", size: "xl" });
  assert.deepEqual(parseLook(null), DEFAULT_LOOK);
  assert.deepEqual(parseLook("não é json"), DEFAULT_LOOK);
  assert.deepEqual(parseLook({ theme: "neon", accent: 3, size: "gigante" }), DEFAULT_LOOK);
  // um campo ruim não derruba os outros
  assert.deepEqual(parseLook({ theme: "grafite", accent: "xyz" }), { theme: "grafite", accent: "ouro", size: "md" });
});

test("o padrão é o visual de sempre: Clássico, ouro, texto normal", () => {
  assert.deepEqual(DEFAULT_LOOK, { theme: "classico", accent: "ouro", size: "md" });
});

test("resolveTheme: automático segue o celular", () => {
  assert.equal(resolveTheme("auto", true), "perola");
  assert.equal(resolveTheme("auto", false), "classico");
  assert.equal(resolveTheme("sol", false), "sol");
});

// ─── Script que roda antes da primeira pintura ──────────────

function runPrePaint(stored: string | null, prefersLight = false) {
  const attrs: Record<string, string> = {};
  const fake = {
    document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
    localStorage: { getItem: (k: string) => (k === LOOK_STORAGE_KEY ? stored : null) },
    window: { matchMedia: () => ({ matches: prefersLight }) },
    matchMedia: () => ({ matches: prefersLight }),
  };
  new Function("document", "localStorage", "window", "matchMedia", prePaintScript())(fake.document, fake.localStorage, fake.window, fake.matchMedia);
  return attrs;
}

test("script de pré-pintura: aplica o que está salvo", () => {
  assert.deepEqual(runPrePaint(JSON.stringify({ theme: "sol", accent: "verde", size: "xl" })), {
    "data-admin-theme": "sol",
    "data-admin-accent": "verde",
    "data-admin-size": "xl",
  });
});

test("script de pré-pintura: sem nada salvo usa o padrão e ignora lixo", () => {
  const padrao = { "data-admin-theme": "classico", "data-admin-accent": "ouro", "data-admin-size": "md" };
  assert.deepEqual(runPrePaint(null), padrao);
  assert.deepEqual(runPrePaint("{quebrado"), padrao);
  assert.deepEqual(runPrePaint(JSON.stringify({ theme: "x", accent: "y", size: "z" })), padrao);
});

test("script de pré-pintura: automático escolhe Pérola quando o celular está no modo claro", () => {
  assert.equal(runPrePaint(JSON.stringify({ theme: "auto" }), true)["data-admin-theme"], "perola");
  assert.equal(runPrePaint(JSON.stringify({ theme: "auto" }), false)["data-admin-theme"], "classico");
});

// ─── TypeScript e CSS contam a mesma história ────────────────

test("todo tema e toda cor de destaque têm bloco no theme.css, e vice-versa", () => {
  const cssThemes = new Set(rules.filter((r) => r.attr === "theme").map((r) => r.key));
  const cssAccents = new Set(rules.filter((r) => r.attr === "accent").map((r) => r.key));
  assert.deepEqual([...cssThemes].sort(), THEMES.map((t) => t.key).sort());
  assert.deepEqual([...cssAccents].sort(), ACCENTS.map((a) => a.key).sort());
});

test("as amostras de cor do seletor batem com o CSS", () => {
  for (const a of ACCENTS) {
    const v = resolved("classico", a.key);
    assert.equal(v["--a-dk"].toLowerCase(), a.dark, `${a.key}: cor para fundo escuro`);
    assert.equal(v["--a-lt"].toLowerCase(), a.light, `${a.key}: cor para fundo claro`);
  }
  for (const t of THEMES) {
    const v = resolved(t.key, "ouro");
    assert.deepEqual([v["--bg-primary"], v["--bg-card"], v["--text-primary"]].map((c) => c.toLowerCase()), [...t.swatch], `${t.key}: amostra`);
  }
});

// ─── Contraste (acessibilidade) ──────────────────────────────

test("todas as combinações de tema e cor de destaque têm contraste legível", () => {
  const falhas: string[] = [];
  const check = (nome: string, a: string, b: string, min: number) => {
    const c = contrast(a, b);
    if (c < min) falhas.push(`${nome}: ${c.toFixed(2)} (mínimo ${min}) — ${a} sobre ${b}`);
  };
  for (const t of THEMES) {
    for (const a of ACCENTS) {
      const v = resolved(t.key, a.key);
      const id = `${t.key}/${a.key}`;
      check(`${id} texto principal no fundo`, v["--text-primary"], v["--bg-primary"], 7);
      check(`${id} texto principal no cartão`, v["--text-primary"], v["--bg-card"], 7);
      for (const bg of ["--bg-primary", "--bg-card"]) check(`${id} texto secundário em ${bg}`, v["--text-secondary"], v[bg], 4.5);
      for (const bg of ["--bg-primary", "--bg-card", "--bg-elevated", "--bg-secondary"]) check(`${id} texto apagado em ${bg}`, v["--text-muted"], v[bg], 4.5);
      for (const s of ["--ok", "--warn", "--bad", "--info"]) for (const bg of ["--bg-primary", "--bg-card"]) check(`${id} ${s} em ${bg}`, v[s], v[bg], 4.5);
      for (const bg of ["--bg-primary", "--bg-card", "--bg-elevated"]) check(`${id} destaque em ${bg}`, v["--gold"], v[bg], 4.5);
      check(`${id} destaque claro/hover em cartão`, v["--gold-light"], v["--bg-card"], 4.5);
      check(`${id} letra sobre botão de destaque`, v["--bg-primary"], v["--gold"], 4.5);
      check(`${id} letra sobre botão de destaque (hover)`, v["--bg-primary"], v["--gold-light"], 4.5);
    }
  }
  assert.deepEqual(falhas, [], `\n${falhas.join("\n")}`);
});

test("as letras também são legíveis sobre as tintas que o painel usa (etiquetas, avisos, bolhas)", () => {
  const falhas: string[] = [];
  const TODOS = ["--bg-primary", "--bg-secondary", "--bg-card", "--bg-elevated"];
  for (const t of THEMES) {
    for (const a of ACCENTS) {
      const v = resolved(t.key, a.key);
      const id = `${t.key}/${a.key}`;
      const suave = t.dark ? 0.15 : 0.12; // --gold-muted (ver theme.css)
      /** Cada letra em `textos` sobre `cor` com opacidade `alpha`, por cima de cada fundo em `fundos`. */
      const sobre = (onde: string, cor: string, alpha: number, fundos: string[], textos: string[]) => {
        for (const f of fundos) {
          const tinta = blend(v[cor], alpha, v[f]);
          for (const tx of textos) {
            const c = contrast(v[tx], tinta);
            if (c < 4.5) falhas.push(`${id} ${tx} ${onde} em ${f}: ${c.toFixed(2)} (mínimo 4.5) — ${v[tx]} sobre ${tinta}`);
          }
        }
      };
      sobre("na etiqueta ou item de menu ativo", "--gold", suave, TODOS, ["--gold", "--text-primary"]);
      sobre("no botão tingido", "--gold", 0.1, ["--bg-primary", "--bg-card", "--bg-elevated"], ["--gold", "--text-primary"]);
      sobre("na bolha da Margot", "--gold", suave, ["--bg-primary"], ["--gold", "--text-primary", "--text-secondary"]);
      sobre("na bolha do Leonardo", "--gold", 0.2, ["--bg-primary"], ["--gold-light", "--text-primary", "--text-secondary"]);
      sobre("no cartão em destaque", "--gold", suave * 0.4, ["--bg-primary", "--bg-card"], ["--gold", "--text-primary", "--text-secondary", "--text-muted"]);
      sobre("no dia bloqueado da agenda", "--text-primary", 0.1, ["--bg-card"], ["--text-secondary"]);
      for (const s of ["--ok", "--warn", "--bad", "--info"]) {
        for (const alpha of [0.05, 0.1]) {
          const onde = `no aviso ${s} a ${Math.round(alpha * 100)}%`;
          sobre(onde, s, alpha, ["--bg-primary", "--bg-card"], [s, "--text-primary", "--text-secondary"]);
          sobre(onde, s, alpha, ["--bg-primary"], ["--text-muted"]);
        }
      }
    }
  }
  assert.deepEqual(falhas, [], `\n${falhas.join("\n")}`);
});

test("o site público não muda: os padrões do :root são os de sempre", () => {
  assert.equal(rootDefaults["--gold"], "#C9A84C");
  assert.equal(rootDefaults["--bg-primary"], "#0a0a0a");
  assert.equal(rootDefaults["--bg-card"], "#161616");
  assert.equal(rootDefaults["--text-primary"], "#f5f0e8");
  assert.equal(rootDefaults["--text-muted"], "#6b6560");
});
