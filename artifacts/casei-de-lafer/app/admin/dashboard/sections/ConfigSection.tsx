"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminSection from "../AdminSection";

export default function ConfigSection() {
  const [weddingCount, setWeddingCount] = useState<number>(0);
  const [driverQuote, setDriverQuote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["site-config"],
    queryFn: () => fetch("/api/site-config").then((r) => r.json()),
  });

  useEffect(() => {
    if (data) {
      setWeddingCount(data.weddingCount ?? 0);
      setDriverQuote(data.driverQuote ?? "");
    }
  }, [data]);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weddingCount, driverQuote }),
    });
    queryClient.invalidateQueries({ queryKey: ["site-config"] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  return (
    <AdminSection title="Configurações">
      <div className="space-y-6 max-w-lg">
        <div className="space-y-2">
          <label className="font-sans text-sm text-text-secondary">
            Casamentos realizados
          </label>
          <input
            type="number"
            min={0}
            value={weddingCount}
            onChange={(e) => setWeddingCount(Number(e.target.value))}
            className="w-full bg-bg-elevated border border-border-subtle text-text-primary placeholder-text-muted px-4 py-2.5 rounded font-sans text-sm focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="font-sans text-sm text-text-secondary">
            Frase do motorista
          </label>
          <textarea
            value={driverQuote}
            onChange={(e) => setDriverQuote(e.target.value)}
            rows={4}
            placeholder='"Uma experiência única..."'
            className="w-full bg-bg-elevated border border-border-subtle text-text-primary placeholder-text-muted px-4 py-2.5 rounded font-sans text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gold hover:bg-gold-light disabled:opacity-40 text-bg-primary font-sans font-semibold text-xs tracking-widest px-6 py-2.5 rounded transition-colors uppercase cursor-pointer"
        >
          {saved ? "Salvo ✓" : saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </AdminSection>
  );
}
