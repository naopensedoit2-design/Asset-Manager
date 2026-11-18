"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X } from "lucide-react";
import AdminSection from "./AdminSection";

interface BlockedDate {
  id: number;
  date: string;
  label: string;
}

export default function BloqueiosDeData() {
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [label, setLabel] = useState("Reservado");
  const [blocking, setBlocking] = useState(false);
  const queryClient = useQueryClient();

  const { data: blockedDates = [] } = useQuery<BlockedDate[]>({
    queryKey: ["blocked-dates"],
    queryFn: () => fetch("/api/dates?manual=1").then((r) => r.json()),
  });

  const blockedDateStrings = new Set(blockedDates.map((d) => d.date));
  const blockedDayObjects = blockedDates.map(
    (d) => new Date(d.date + "T12:00:00"),
  );

  function handleDayClick(date: Date | undefined) {
    if (!date) return;
    const key = format(date, "yyyy-MM-dd");
    if (blockedDateStrings.has(key)) {
      const found = blockedDates.find((d) => d.date === key);
      if (found) handleUnblock(found.id);
    } else {
      setPendingDate(date);
      setLabel("Reservado");
    }
  }

  async function handleBlock() {
    if (!pendingDate) return;
    setBlocking(true);
    await fetch("/api/admin/dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: format(pendingDate, "yyyy-MM-dd"),
        label,
      }),
    });
    queryClient.invalidateQueries({ queryKey: ["blocked-dates"] });
    setPendingDate(null);
    setLabel("Reservado");
    setBlocking(false);
  }

  async function handleUnblock(id: number) {
    await fetch(`/api/admin/dates/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["blocked-dates"] });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <AdminSection title="Bloquear datas">
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
          <p className="font-sans text-sm text-text-muted mb-4">
            Data bloqueada some da página Datas livres e a Margot não a oferece. Clique em uma data para bloquear; clique em uma data bloqueada (
            <span className="text-gold">destacada</span>) para desbloquear.
          </p>
          <style>{`
            .rdp-root { --rdp-accent-color: var(--gold); --rdp-accent-background-color: var(--gold-muted); color: var(--text-primary); font-family: 'Inter', sans-serif; }
            .rdp-day_button { color: var(--text-primary); }
            .rdp-day_button:hover { background: var(--gold-muted); }
            .rdp-selected .rdp-day_button { background: var(--gold-muted) !important; color: var(--gold) !important; font-weight: 600; box-shadow: inset 0 0 0 1px var(--border-gold); }
            .rdp-today .rdp-day_button { color: var(--gold-light); font-weight: 600; }
            .rdp-outside .rdp-day_button { color: var(--text-muted); }
            .rdp-disabled .rdp-day_button { color: var(--text-muted); opacity: 0.45; cursor: not-allowed; }
            .rdp-nav button { color: var(--gold); }
            .rdp-month_caption { color: var(--text-primary); font-family: 'Playfair Display', serif; }
            .rdp-weekday { color: var(--text-muted); font-size: 0.75rem; }
            .rdp-month_grid { border-collapse: separate; border-spacing: 2px; }
          `}</style>
          <DayPicker
            mode="single"
            locale={ptBR}
            onSelect={handleDayClick}
            disabled={{ before: today }}
            modifiers={{ blocked: blockedDayObjects }}
            modifiersClassNames={{ blocked: "rdp-selected" }}
            showOutsideDays
          />

          {pendingDate && (
            <div className="mt-4 p-4 bg-bg-elevated border border-gold/30 rounded space-y-3">
              <p className="font-sans text-sm text-text-primary">
                Bloquear{" "}
                <strong className="text-gold">
                  {format(pendingDate, "dd 'de' MMMM yyyy", { locale: ptBR })}
                </strong>
              </p>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Motivo (ex: Reservado)"
                className="w-full bg-bg-card border border-border-subtle text-text-primary placeholder:text-text-muted px-3 py-2 rounded font-sans text-sm focus:outline-none focus:border-gold/50 transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleBlock}
                  disabled={blocking}
                  className="flex-1 bg-gold hover:bg-gold-light disabled:opacity-40 text-bg-primary font-sans text-sm font-semibold tracking-wide min-h-11 py-2 rounded transition-colors uppercase cursor-pointer"
                >
                  {blocking ? "Bloqueando..." : "Confirmar bloqueio"}
                </button>
                <button
                  onClick={() => setPendingDate(null)}
                  className="px-3 py-2 bg-bg-card border border-border-subtle text-text-muted hover:text-text-primary rounded transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-sans text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Datas bloqueadas ({blockedDates.length})
          </h3>
          {blockedDates.length === 0 ? (
            <p className="font-sans text-sm text-text-muted">
              Nenhuma data bloqueada.
            </p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {blockedDates
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between bg-bg-elevated border border-border-subtle rounded px-3 py-2"
                  >
                    <div>
                      <span className="font-sans text-sm text-text-primary">
                        {format(parseISO(d.date), "dd/MM/yyyy")}
                      </span>
                      <span className="ml-2 font-sans text-sm text-text-muted">
                        {d.label}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnblock(d.id)}
                      className="text-text-muted hover:text-bad transition-colors cursor-pointer ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
        </div>
      </div>
    </AdminSection>
  );
}
