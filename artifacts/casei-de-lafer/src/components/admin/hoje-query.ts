"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/components/gestor/ui";
import type { HojeData } from "@/lib/admin/hoje";

export const HOJE_KEY = ["hoje"];

/** Pacote da tela "Hoje". O menu usa o mesmo (para os números nas abas), então só uma busca por minuto. */
export function useHoje(options: { enabled?: boolean } = {}) {
  return useQuery<HojeData>({
    queryKey: HOJE_KEY,
    queryFn: () => api("/api/admin/gestor/hoje"),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
    refetchOnWindowFocus: true,
    enabled: options.enabled ?? true,
  });
}
