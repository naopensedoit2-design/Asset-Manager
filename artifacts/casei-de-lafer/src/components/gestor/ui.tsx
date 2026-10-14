"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { STATUS_LABELS, type OrderStatus } from "@/lib/gestor/rules";

// ─── Chamadas à API do painel ────────────────────────────────

export async function api<T = any>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.redirected && res.url.includes("/admin/login")) {
    window.location.href = "/admin/login";
    throw new Error("Sessão expirada. Entre novamente.");
  }
  const json = await res.json().catch(() => null);
  if (!json?.ok) throw new Error(json?.erro?.mensagem ?? "Não foi possível concluir. Tente de novo.");
  return json.data as T;
}

// ─── Cabeçalho do admin ──────────────────────────────────────

const NAV = [
  { href: "/admin/dashboard", label: "Gestão" },
  { href: "/admin/dashboard?aba=site", label: "Site" },
  { href: "/admin/regras", label: "Regras" },
];

export function AdminHeader({ active }: { active: "gestao" | "site" | "regras" | "pedido" }) {
  const router = useRouter();
  const current = active === "pedido" ? "gestao" : active;

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <header className="sticky top-0 z-40 bg-bg-secondary/95 backdrop-blur border-b border-border-subtle">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2 sm:gap-4">
        <Link href="/admin/dashboard" className="font-serif text-base sm:text-lg text-text-primary whitespace-nowrap">
          Casei de Lafer
        </Link>
        <nav className="flex gap-1 overflow-x-auto" aria-label="Seções do painel">
          {NAV.map((item) => {
            const key = item.label === "Gestão" ? "gestao" : item.label === "Site" ? "site" : "regras";
            const on = key === current;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
                  on ? "bg-gold-muted text-gold" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <a href="/" target="_blank" className="hidden sm:inline text-sm text-text-muted hover:text-text-primary">
            Ver site
          </a>
          <button onClick={logout} className="text-sm text-text-muted hover:text-destructive cursor-pointer">
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Peças visuais ───────────────────────────────────────────

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-bg-card border border-border-subtle rounded-lg p-4 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="font-serif text-xl text-text-primary">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_TONE: Record<OrderStatus, string> = {
  novo: "border-sky-400/40 text-sky-300",
  orcamento_enviado: "border-gold/40 text-gold-light",
  aguardando_resposta: "border-amber-500/40 text-amber-300",
  reservado: "border-gold/60 text-gold",
  confirmado: "border-emerald-500/50 text-emerald-300",
  realizado: "border-white/20 text-text-secondary",
  perdido: "border-white/10 text-text-muted",
  cancelado: "border-destructive/50 text-red-300",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block border rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap ${STATUS_TONE[status] ?? ""}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function Button({
  variant = "gold",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "ghost" | "danger" }) {
  const styles = {
    gold: "bg-gold hover:bg-gold-light text-bg-primary font-semibold",
    ghost: "bg-bg-elevated border border-border-subtle text-text-primary hover:border-gold/40",
    danger: "bg-transparent border border-destructive/50 text-red-300 hover:bg-destructive/10",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm text-text-secondary">{label}</span>
      {children}
      {hint && <span className="block text-xs text-text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full bg-bg-elevated border border-border-subtle text-text-primary placeholder-text-muted px-3 py-2.5 rounded text-base sm:text-sm focus:outline-none focus:border-gold/60 transition-colors";

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-red-300 bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
      {message}
    </p>
  );
}

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return <p className="text-sm text-text-muted py-8 text-center">{label}</p>;
}

export function useIsActive(path: string) {
  return usePathname() === path;
}

export function whatsappLink(phone: string, text?: string) {
  return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
