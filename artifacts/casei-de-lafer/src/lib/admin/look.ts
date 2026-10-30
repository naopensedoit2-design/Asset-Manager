// Aparência do painel: tema, cor de destaque e tamanho do texto. Regra pura (sem React nem DOM),
// para poder testar. As cores em si ficam em app/admin/theme.css.

export const LOOK_STORAGE_KEY = "ecl-admin-look";

export const THEMES = [
  { key: "classico", label: "Clássico", hint: "Escuro com fundo quase preto (o visual de sempre)", dark: true, swatch: ["#0a0a0a", "#161616", "#f5f0e8"] },
  { key: "grafite", label: "Grafite", hint: "Escuro com fundo azulado, mais neutro", dark: true, swatch: ["#0d1013", "#171c21", "#e9eef2"] },
  { key: "perola", label: "Pérola", hint: "Claro e suave, para o dia a dia", dark: false, swatch: ["#edf0f3", "#ffffff", "#15191e"] },
  { key: "sol", label: "Sol", hint: "Contraste máximo, para usar na rua com sol na tela", dark: false, swatch: ["#ffffff", "#ffffff", "#000000"] },
] as const;

export const ACCENTS = [
  { key: "ouro", label: "Ouro", dark: "#c9a84c", light: "#795e0f" },
  { key: "bordo", label: "Bordô", dark: "#e77d8b", light: "#9b1c3a" },
  { key: "verde", label: "Verde", dark: "#55b98b", light: "#1b6b4a" },
  { key: "cobalto", label: "Cobalto", dark: "#6ea2ff", light: "#1d4fbf" },
  { key: "rose", label: "Rosé", dark: "#e98fb0", light: "#a52f5f" },
  { key: "cobre", label: "Cobre", dark: "#e39a5c", light: "#974c14" },
] as const;

export const SIZES = [
  { key: "md", label: "Normal", sample: "Aa" },
  { key: "lg", label: "Grande", sample: "Aa" },
  { key: "xl", label: "Maior", sample: "Aa" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];
export type AccentKey = (typeof ACCENTS)[number]["key"];
export type SizeKey = (typeof SIZES)[number]["key"];
/** "auto" segue o celular: escuro vira Clássico, claro vira Pérola. */
export type ThemeChoice = ThemeKey | "auto";

export interface Look {
  theme: ThemeChoice;
  accent: AccentKey;
  size: SizeKey;
}

export const DEFAULT_LOOK: Look = { theme: "classico", accent: "ouro", size: "md" };

/** Cor da barra do navegador (meta theme-color) por tema. */
export const THEME_BAR_COLOR: Record<ThemeKey, string> = {
  classico: "#111111",
  grafite: "#12161a",
  perola: "#f7f8fa",
  sol: "#ffffff",
};

const themeKeys: readonly string[] = [...THEMES.map((t) => t.key), "auto"];
const accentKeys: readonly string[] = ACCENTS.map((a) => a.key);
const sizeKeys: readonly string[] = SIZES.map((s) => s.key);

/** Lê o que está salvo no aparelho; qualquer valor desconhecido volta ao padrão. */
export function parseLook(raw: unknown): Look {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      v = null;
    }
  }
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    theme: typeof o.theme === "string" && themeKeys.includes(o.theme) ? (o.theme as ThemeChoice) : DEFAULT_LOOK.theme,
    accent: typeof o.accent === "string" && accentKeys.includes(o.accent) ? (o.accent as AccentKey) : DEFAULT_LOOK.accent,
    size: typeof o.size === "string" && sizeKeys.includes(o.size) ? (o.size as SizeKey) : DEFAULT_LOOK.size,
  };
}

/** Tema que vale de fato agora ("auto" depende de o celular estar no modo claro). */
export function resolveTheme(choice: ThemeChoice, prefersLight: boolean): ThemeKey {
  if (choice === "auto") return prefersLight ? "perola" : "classico";
  return choice;
}

/**
 * Script que roda antes da primeira pintura (dentro do HTML) e marca o <html> com a aparência salva,
 * para a tela não piscar no tema errado. Mantém a mesma lógica de parseLook/resolveTheme.
 */
export function prePaintScript(): string {
  const themes = JSON.stringify(themeKeys);
  const accents = JSON.stringify(accentKeys);
  const sizes = JSON.stringify(sizeKeys);
  const d = DEFAULT_LOOK;
  return `(function(){try{var d=document.documentElement,l={};try{l=JSON.parse(localStorage.getItem(${JSON.stringify(
    LOOK_STORAGE_KEY,
  )})||"{}")||{}}catch(e){}var t=${themes}.indexOf(l.theme)>-1?l.theme:${JSON.stringify(d.theme)};if(t==="auto"){t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"perola":"classico"}d.setAttribute("data-admin-theme",t);d.setAttribute("data-admin-accent",${accents}.indexOf(l.accent)>-1?l.accent:${JSON.stringify(
    d.accent,
  )});d.setAttribute("data-admin-size",${sizes}.indexOf(l.size)>-1?l.size:${JSON.stringify(d.size)})}catch(e){}})();`;
}
