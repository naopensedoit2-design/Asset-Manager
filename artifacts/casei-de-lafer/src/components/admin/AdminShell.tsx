"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LogOut, Palette } from "lucide-react";
import { api } from "@/components/gestor/ui";
import { activeTab, hidesTabBar, isBare } from "@/lib/admin/nav";
import AppearanceSheet from "./AppearanceSheet";
import { useHoje } from "./hoje-query";
import { LookProvider } from "./look-context";
import MargotSheet, { useMargotSettings } from "./MargotSheet";
import { MORE, TABS, type NavItem } from "./nav";
import { ShellContext } from "./shell-context";

/** Moldura do painel: topo e menu inferior no celular, menu lateral no computador. */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <LookProvider>
      <Frame>{children}</Frame>
    </LookProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const bare = isBare(pathname);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [margotOpen, setMargotOpen] = useState(false);

  const hoje = useHoje({ enabled: !bare });
  const { data: settings } = useMargotSettings();
  const { data: unread } = useQuery<{ total: number }>({
    queryKey: ["wa-nao-lidas"],
    queryFn: () => api("/api/admin/whatsapp/nao-lidas"),
    refetchInterval: 30_000,
    retry: false,
    enabled: !bare,
  });

  const logout = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }, [router]);

  const shell = useMemo(
    () => ({ openAppearance: () => setAppearanceOpen(true), openMargot: () => setMargotOpen(true), logout }),
    [logout],
  );

  if (bare) return <div className="admin-app bg-bg-primary text-text-primary">{children}</div>;

  const current = activeTab(pathname);
  const hideBar = hidesTabBar(pathname);
  const badges: Record<string, { count: number; tone: "bad" | "gold" } | undefined> = {
    hoje: hoje.data && hoje.data.fila.length ? { count: hoje.data.fila.length, tone: "bad" } : undefined,
    conversas: unread && unread.total > 0 ? { count: unread.total, tone: "gold" } : undefined,
  };
  const margotState: "on" | "off" | "unknown" = settings ? (settings.margotWhatsapp ? "on" : "off") : "unknown";

  return (
    <ShellContext.Provider value={shell}>
      <div className="admin-app bg-bg-primary text-text-primary">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:bg-gold focus:text-bg-primary focus:px-3 focus:py-2 focus:rounded"
        >
          Ir para o conteúdo
        </a>

        {/* Menu lateral: computador */}
        <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[248px] flex-col bg-bg-secondary border-r border-border-subtle">
          <Link href="/admin/hoje" className="px-6 pt-7 pb-6 font-serif text-xl leading-tight text-text-primary">
            Eu casei de Lafer
          </Link>
          <nav aria-label="Seções do painel" className="px-3 space-y-0.5">
            {TABS.filter((t) => t.key !== "mais").map((t) => (
              <SideLink key={t.key} item={t} on={current === t.key} badge={badges[t.key]} />
            ))}
            <div className="my-3 mx-3 border-t border-border-subtle" />
            {MORE.map((m) => (
              <SideLink key={m.key} item={m} on={pathname === m.href || pathname.startsWith(`${m.href}/`)} />
            ))}
          </nav>
          <div className="mt-auto p-3 space-y-0.5 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setMargotOpen(true)}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary cursor-pointer"
            >
              <Dot state={margotState} />
              {margotState === "off" ? "Margot pausada" : margotState === "on" ? "Margot ligada" : "Margot"}
            </button>
            <button
              type="button"
              onClick={() => setAppearanceOpen(true)}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary cursor-pointer"
            >
              <Palette className="w-[18px] h-[18px]" aria-hidden="true" /> Aparência
            </button>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            >
              <ExternalLink className="w-[18px] h-[18px]" aria-hidden="true" /> Ver o site
            </a>
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary cursor-pointer"
            >
              <LogOut className="w-[18px] h-[18px]" aria-hidden="true" /> Sair
            </button>
          </div>
        </aside>

        <div className="lg:pl-[248px]">
          {/* Topo: celular */}
          <header className="lg:hidden sticky top-0 z-40 bg-bg-secondary/95 backdrop-blur border-b border-border-subtle pt-[env(safe-area-inset-top)]">
            <div className="h-14 px-4 flex items-center gap-3">
              <Link href="/admin/hoje" className="min-w-0 truncate font-serif text-[17px] leading-none text-text-primary">
                Eu casei de Lafer
              </Link>
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMargotOpen(true)}
                  className="inline-flex items-center gap-2 h-9 rounded-full border border-border-subtle bg-bg-card pl-3 pr-3.5 text-[13px] text-text-primary cursor-pointer"
                >
                  <Dot state={margotState} />
                  Margot
                  <span className="text-text-secondary">{margotState === "off" ? "pausada" : margotState === "on" ? "ligada" : ""}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAppearanceOpen(true)}
                  aria-label="Aparência"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-elevated cursor-pointer"
                >
                  <Palette className="w-[18px] h-[18px]" aria-hidden="true" />
                </button>
              </div>
            </div>
          </header>

          <div id="conteudo" className={hideBar ? "" : "pb-[calc(var(--tabbar-h)+1rem)] lg:pb-0"}>
            {children}
          </div>
        </div>

        {/* Menu inferior: celular */}
        {!hideBar && (
          <nav aria-label="Seções do painel" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-bg-secondary/95 backdrop-blur border-t border-border-subtle pb-[env(safe-area-inset-bottom)]">
            <ul className="grid grid-cols-5 h-16 max-w-xl mx-auto">
              {TABS.map((t) => {
                const on = current === t.key;
                const badge = badges[t.key];
                const Icon = t.icon;
                return (
                  <li key={t.key} className="relative">
                    <Link
                      href={t.href}
                      aria-current={on ? "page" : undefined}
                      className={`relative h-full flex flex-col items-center justify-center gap-1 text-[11px] leading-none transition-colors ${on ? "text-gold" : "text-text-secondary"}`}
                    >
                      {on && <span aria-hidden="true" className="absolute top-0 h-[3px] w-9 rounded-b-full bg-gold" />}
                      <span className="relative">
                        <Icon className="w-[22px] h-[22px]" strokeWidth={on ? 2.25 : 1.75} aria-hidden="true" />
                        {badge && (
                          <span
                            className={`absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center text-[10px] font-semibold ${badge.tone === "bad" ? "bg-bad" : "bg-gold"} text-bg-primary`}
                          >
                            <span aria-hidden="true">{badge.count > 99 ? "99+" : badge.count}</span>
                            <span className="sr-only">{badge.tone === "bad" ? `${badge.count} pendências` : `${badge.count} mensagens não lidas`}</span>
                          </span>
                        )}
                      </span>
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <AppearanceSheet open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
        <MargotSheet open={margotOpen} onClose={() => setMargotOpen(false)} />
      </div>
    </ShellContext.Provider>
  );
}

function SideLink({ item, on, badge }: { item: NavItem; on: boolean; badge?: { count: number; tone: "bad" | "gold" } }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${on ? "bg-gold-muted text-gold" : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"}`}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={on ? 2.25 : 1.75} aria-hidden="true" />
      <span className="truncate">{item.label}</span>
      {badge && (
        <span className={`ml-auto min-w-[20px] h-5 px-1.5 rounded-full grid place-items-center text-[11px] font-semibold ${badge.tone === "bad" ? "bg-bad" : "bg-gold"} text-bg-primary`}>
          {badge.count > 99 ? "99+" : badge.count}
        </span>
      )}
    </Link>
  );
}

/** Bolinha de estado: verde = ligada, vermelha = pausada. O texto ao lado diz o mesmo (cor sozinha não basta). */
function Dot({ state }: { state: "on" | "off" | "unknown" }) {
  const color = state === "on" ? "bg-ok" : state === "off" ? "bg-bad" : "bg-text-muted";
  return <span aria-hidden="true" className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}
