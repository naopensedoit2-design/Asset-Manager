"use client";

import { Check, MonitorSmartphone } from "lucide-react";
import { ACCENTS, SIZES, THEMES } from "@/lib/admin/look";
import Sheet from "./Sheet";
import { useLook } from "./look-context";

/** Escolha de tema, cor de destaque e tamanho do texto. Vale na hora e fica salva neste aparelho. */
export default function AppearanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { look, theme, setLook, reset } = useLook();
  const darkNow = THEMES.find((t) => t.key === theme)?.dark ?? true;
  const accentNow = ACCENTS.find((a) => a.key === look.accent) ?? ACCENTS[0];

  return (
    <Sheet open={open} onClose={onClose} title="Aparência">
      <div className="space-y-6">
        <section aria-labelledby="look-tema">
          <h3 id="look-tema" className="font-sans text-sm font-medium text-text-secondary mb-2.5">
            Tema
          </h3>
          <div role="radiogroup" aria-labelledby="look-tema" className="grid grid-cols-2 gap-2.5">
            {THEMES.map((t) => (
              <ThemeOption
                key={t.key}
                label={t.label}
                hint={t.hint}
                swatch={t.swatch}
                accent={t.dark ? accentNow.dark : accentNow.light}
                on={look.theme === t.key}
                onClick={() => setLook({ theme: t.key })}
              />
            ))}
          </div>
          <button
            type="button"
            role="radio"
            aria-checked={look.theme === "auto"}
            onClick={() => setLook({ theme: "auto" })}
            data-autofocus={look.theme === "auto" ? "" : undefined}
            className={`mt-2.5 w-full flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left cursor-pointer transition-colors ${
              look.theme === "auto" ? "border-gold bg-gold-muted" : "border-border-subtle bg-bg-card hover:border-border-gold"
            }`}
          >
            <MonitorSmartphone className="w-5 h-5 text-text-secondary shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm text-text-primary">Automático</span>
              <span className="block text-xs text-text-muted">Segue o celular: escuro de noite, claro de dia</span>
            </span>
            {look.theme === "auto" && <Check className="w-4 h-4 text-gold ml-auto shrink-0" aria-hidden="true" />}
          </button>
        </section>

        <section aria-labelledby="look-cor">
          <h3 id="look-cor" className="font-sans text-sm font-medium text-text-secondary mb-2.5">
            Cor de destaque
          </h3>
          <div role="radiogroup" aria-labelledby="look-cor" className="grid grid-cols-6 gap-2">
            {ACCENTS.map((a) => {
              const on = look.accent === a.key;
              const color = darkNow ? a.dark : a.light;
              return (
                <button
                  key={a.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={a.label}
                  onClick={() => setLook({ accent: a.key })}
                  className="group flex flex-col items-center gap-1.5 cursor-pointer"
                >
                  <span
                    className={`w-11 h-11 rounded-full inline-flex items-center justify-center ring-offset-2 ring-offset-bg-secondary transition-shadow ${on ? "ring-2 ring-text-primary" : "ring-1 ring-border-subtle group-hover:ring-text-muted"}`}
                    style={{ backgroundColor: color }}
                  >
                    {on && <Check className="w-5 h-5" style={{ color: darkNow ? "var(--bg-primary)" : "var(--bg-card)" }} aria-hidden="true" />}
                  </span>
                  <span className={`text-[11px] leading-none ${on ? "text-text-primary" : "text-text-muted"}`}>{a.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="look-tamanho">
          <h3 id="look-tamanho" className="font-sans text-sm font-medium text-text-secondary mb-2.5">
            Tamanho do texto
          </h3>
          <div role="radiogroup" aria-labelledby="look-tamanho" className="grid grid-cols-3 gap-2.5">
            {SIZES.map((s, i) => {
              const on = look.size === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setLook({ size: s.key })}
                  className={`rounded-lg border py-2.5 flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
                    on ? "border-gold bg-gold-muted text-gold" : "border-border-subtle bg-bg-card text-text-secondary hover:border-border-gold"
                  }`}
                >
                  <span className="font-serif leading-none" style={{ fontSize: 16 + i * 4 }} aria-hidden="true">
                    {s.sample}
                  </span>
                  <span className="text-xs">{s.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-text-muted">A escolha fica salva só neste aparelho.</p>
          <button type="button" onClick={reset} className="text-sm text-text-secondary underline underline-offset-4 hover:text-text-primary cursor-pointer shrink-0">
            Voltar ao padrão
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function ThemeOption({
  label,
  hint,
  swatch,
  accent,
  on,
  onClick,
}: {
  label: string;
  hint: string;
  swatch: readonly string[];
  accent: string;
  on: boolean;
  onClick: () => void;
}) {
  const [page, card, text] = swatch;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      data-autofocus={on ? "" : undefined}
      className={`rounded-lg border p-2.5 text-left cursor-pointer transition-colors ${on ? "border-gold bg-gold-muted" : "border-border-subtle bg-bg-card hover:border-border-gold"}`}
    >
      {/* miniatura: fundo, cartão, linhas de texto e botão de destaque */}
      <span className="block rounded-md p-2 mb-2 border border-black/10" style={{ backgroundColor: page }} aria-hidden="true">
        <span className="block rounded-[5px] p-1.5 border border-black/10" style={{ backgroundColor: card }}>
          <span className="block h-1.5 w-3/4 rounded-full mb-1" style={{ backgroundColor: text }} />
          <span className="block h-1 w-1/2 rounded-full mb-1.5 opacity-60" style={{ backgroundColor: text }} />
          <span className="block h-2.5 w-8 rounded-[3px]" style={{ backgroundColor: accent }} />
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-sm text-text-primary">
        {label}
        {on && <Check className="w-3.5 h-3.5 text-gold" aria-hidden="true" />}
      </span>
      <span className="block text-[11px] leading-snug text-text-muted mt-0.5">{hint}</span>
    </button>
  );
}
