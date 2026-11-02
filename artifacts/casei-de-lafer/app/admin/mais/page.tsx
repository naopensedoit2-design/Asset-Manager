"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ExternalLink, LogOut, Palette, Power } from "lucide-react";
import { api } from "@/components/gestor/ui";
import { useLook } from "@/components/admin/look-context";
import { useMargotSettings } from "@/components/admin/MargotSheet";
import { MORE } from "@/components/admin/nav";
import { useShell } from "@/components/admin/shell-context";
import { Chip, PageTitle } from "@/components/admin/ui";
import { ACCENTS, SIZES, THEMES } from "@/lib/admin/look";
import type { ConexoesData } from "@/lib/admin/conexoes-service";

const rowClass = "flex w-full items-center gap-4 px-4 py-3.5 min-h-[68px] text-left transition-colors hover:bg-bg-elevated cursor-pointer";

function IconBox({ children }: { children: React.ReactNode }) {
  return <span className="grid w-10 h-10 shrink-0 place-items-center rounded-lg bg-bg-elevated text-gold">{children}</span>;
}

export default function MorePage() {
  const { openAppearance, openMargot, logout } = useShell();
  const { look, theme } = useLook();
  const { data: settings } = useMargotSettings();
  const { data: conexoes } = useQuery<ConexoesData>({
    queryKey: ["conexoes"],
    queryFn: () => api("/api/admin/gestor/conexoes"),
    staleTime: 60_000,
    retry: false,
  });

  const themeName = THEMES.find((t) => t.key === theme)?.label ?? "";
  const accentName = ACCENTS.find((a) => a.key === look.accent)?.label ?? "";
  const sizeName = SIZES.find((s) => s.key === look.size)?.label ?? "";

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      <PageTitle title="Mais" hint="O resto do painel, a aparência e a conta." />

      <ul className="overflow-hidden rounded-lg border border-border-subtle bg-bg-card divide-y divide-border-subtle">
        {MORE.map((m) => {
          const Icon = m.icon;
          const attention = m.key === "conexoes" ? (conexoes?.pedemAtencao ?? 0) : 0;
          return (
            <li key={m.key}>
              <Link href={m.href} className={rowClass}>
                <IconBox>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </IconBox>
                <span className="min-w-0 flex-1">
                  <span className="block text-text-primary">{m.label}</span>
                  {m.hint && <span className="block text-sm text-text-secondary">{m.hint}</span>}
                  {attention > 0 && (
                    <Chip tone="warn" className="mt-1.5">
                      {attention} {attention === 1 ? "pede atenção" : "pedem atenção"}
                    </Chip>
                  )}
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-8 mb-3 font-serif text-xl text-text-primary">Neste aparelho</h2>
      <ul className="overflow-hidden rounded-lg border border-border-subtle bg-bg-card divide-y divide-border-subtle">
        <li>
          <button type="button" onClick={openAppearance} className={rowClass}>
            <IconBox>
              <Palette className="w-5 h-5" aria-hidden="true" />
            </IconBox>
            <span className="min-w-0 flex-1">
              <span className="block text-text-primary">Aparência</span>
              <span className="block text-sm text-text-secondary">
                {themeName} · {accentName} · texto {sizeName.toLowerCase()}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
          </button>
        </li>
        <li>
          <button type="button" onClick={openMargot} className={rowClass}>
            <IconBox>
              <Power className="w-5 h-5" aria-hidden="true" />
            </IconBox>
            <span className="min-w-0 flex-1">
              <span className="block text-text-primary">Ligar ou pausar a Margot</span>
              <span className="block text-sm text-text-secondary">
                {settings ? (settings.margotWhatsapp ? "Atendendo no WhatsApp" : "Pausada no WhatsApp") : "WhatsApp e chat do site"}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
          </button>
        </li>
      </ul>

      <ul className="mt-8 overflow-hidden rounded-lg border border-border-subtle bg-bg-card divide-y divide-border-subtle">
        <li>
          <a href="/" target="_blank" rel="noreferrer" className={rowClass}>
            <IconBox>
              <ExternalLink className="w-5 h-5" aria-hidden="true" />
            </IconBox>
            <span className="min-w-0 flex-1 text-text-primary">Ver o site público</span>
          </a>
        </li>
        <li>
          <button type="button" onClick={logout} className={rowClass}>
            <IconBox>
              <LogOut className="w-5 h-5" aria-hidden="true" />
            </IconBox>
            <span className="min-w-0 flex-1 text-text-primary">Sair</span>
          </button>
        </li>
      </ul>
    </main>
  );
}
