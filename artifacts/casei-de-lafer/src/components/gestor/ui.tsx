"use client";

import { usePathname } from "next/navigation";
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
  novo: "border-info/40 text-info",
  orcamento_enviado: "border-gold/40 text-gold-light",
  aguardando_resposta: "border-warn/40 text-warn",
  reservado: "border-gold/60 text-gold",
  confirmado: "border-ok/50 text-ok",
  realizado: "border-text-muted/40 text-text-secondary",
  perdido: "border-border text-text-muted",
  cancelado: "border-bad/50 text-bad",
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
    danger: "bg-transparent border border-bad/50 text-bad hover:bg-bad/10",
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
  "w-full bg-bg-elevated border border-border-subtle text-text-primary placeholder:text-text-muted px-3 py-2.5 rounded text-base sm:text-sm focus:outline-none focus:border-gold/60 transition-colors";

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-bad bg-bad/10 border border-bad/30 rounded px-3 py-2">
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
