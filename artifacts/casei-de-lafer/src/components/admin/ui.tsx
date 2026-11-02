// Peças visuais das telas novas do painel (Hoje, Pedidos, Conexões, Mais). As cores vêm todas dos tokens do tema.

import type { ReactNode } from "react";

export type Tone = "ok" | "warn" | "bad" | "info" | "gold" | "muted";

export const TONE_TEXT: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  bad: "text-bad",
  info: "text-info",
  gold: "text-gold",
  muted: "text-text-muted",
};

export const TONE_BAR: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
  info: "bg-info",
  gold: "bg-gold",
  muted: "bg-text-muted",
};

const TONE_CHIP: Record<Tone, string> = {
  ok: "border-ok/40 text-ok",
  warn: "border-warn/40 text-warn",
  bad: "border-bad/50 text-bad",
  info: "border-info/40 text-info",
  gold: "border-gold/50 text-gold",
  muted: "border-border text-text-secondary",
};

/** Etiqueta pequena. A cor reforça o texto, nunca o substitui. */
export function Chip({ tone = "muted", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs leading-5 whitespace-nowrap ${TONE_CHIP[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Bloco cinza que pulsa enquanto a tela carrega. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-bg-elevated ${className}`} />;
}

/** Título da tela, com uma linha de apoio e, se quiser, um botão à direita. */
export function PageTitle({ title, hint, right }: { title: string; hint?: string; right?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-serif text-[1.75rem] sm:text-3xl text-text-primary leading-tight">{title}</h1>
        {hint && <p className="text-sm text-text-secondary mt-1">{hint}</p>}
      </div>
      {right}
    </header>
  );
}

/** Quadro com título (h2). Para listas e cartões soltos, use o Panel de gestor/ui. */
export function Section({ title, right, children, className = "" }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="font-serif text-xl text-text-primary">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
