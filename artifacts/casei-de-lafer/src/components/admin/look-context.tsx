"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { DEFAULT_LOOK, LOOK_STORAGE_KEY, THEME_BAR_COLOR, parseLook, resolveTheme, type Look, type ThemeKey } from "@/lib/admin/look";

interface LookValue {
  look: Look;
  /** Tema que vale de fato agora (o "Automático" já resolvido). */
  theme: ThemeKey;
  setLook: (patch: Partial<Look>) => void;
  reset: () => void;
}

const LookContext = createContext<LookValue | null>(null);

export function useLook(): LookValue {
  const v = useContext(LookContext);
  if (!v) throw new Error("useLook fora do LookProvider");
  return v;
}

function readStored(): Look {
  try {
    return parseLook(localStorage.getItem(LOOK_STORAGE_KEY));
  } catch {
    return DEFAULT_LOOK;
  }
}

function writeStored(look: Look) {
  try {
    localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify(look));
  } catch {
    // sem armazenamento (aba anônima, por exemplo): a escolha vale só até recarregar
  }
}

/**
 * Guarda a aparência escolhida e marca o <html> com ela. A primeira marca vem do script que roda antes
 * da pintura (app/admin/layout.tsx); aqui o React assume e mantém tudo em dia. Ao sair do painel, as marcas
 * somem e o site público volta ao visual dele.
 */
export function LookProvider({ children }: { children: React.ReactNode }) {
  const [look, setLookState] = useState<Look>(DEFAULT_LOOK);
  const [prefersLight, setPrefersLight] = useState(false);

  useLayoutEffect(() => {
    setLookState(readStored());
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return;
    setPrefersLight(mq.matches);
    const onChange = () => setPrefersLight(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const theme = resolveTheme(look.theme, prefersLight);

  useLayoutEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-admin-theme", theme);
    el.setAttribute("data-admin-accent", look.accent);
    el.setAttribute("data-admin-size", look.size);
  }, [theme, look.accent, look.size]);

  // Cor da barra do navegador no celular.
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta;
    const previous = meta?.content ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = THEME_BAR_COLOR[theme];
    return () => {
      if (!meta) return;
      if (created) meta.remove();
      else if (previous !== null) meta.content = previous;
    };
  }, [theme]);

  // Saiu do painel: o site público volta ao visual dele.
  useEffect(
    () => () => {
      const el = document.documentElement;
      el.removeAttribute("data-admin-theme");
      el.removeAttribute("data-admin-accent");
      el.removeAttribute("data-admin-size");
    },
    [],
  );

  const setLook = useCallback((patch: Partial<Look>) => {
    setLookState((prev) => {
      const next = parseLook({ ...prev, ...patch });
      writeStored(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    writeStored(DEFAULT_LOOK);
    setLookState(DEFAULT_LOOK);
  }, []);

  const value = useMemo(() => ({ look, theme, setLook, reset }), [look, theme, setLook, reset]);
  return <LookContext.Provider value={value}>{children}</LookContext.Provider>;
}
