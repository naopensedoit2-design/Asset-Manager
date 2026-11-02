"use client";

import { createContext, useContext } from "react";

interface ShellValue {
  openAppearance: () => void;
  openMargot: () => void;
  logout: () => void;
}

export const ShellContext = createContext<ShellValue | null>(null);

/** Ações da moldura do painel (abrir Aparência, abrir a folha da Margot, sair) para as telas usarem. */
export function useShell(): ShellValue {
  const v = useContext(ShellContext);
  if (!v) throw new Error("useShell fora do AdminShell");
  return v;
}
