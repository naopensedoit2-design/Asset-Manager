"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminSection from "./AdminSection";

export default function NumeroReserva() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["site-config"],
    queryFn: () => fetch("/api/site-config").then((r) => r.json()),
  });

  const [number, setNumber] = useState<string>("");

  const currentNumber = number || data?.whatsappNumber || "";

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsappNumber: currentNumber }),
    });
    queryClient.invalidateQueries({ queryKey: ["site-config"] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  return (
    <AdminSection title="WhatsApp dos botões">
      <p className="font-sans text-sm text-text-secondary mb-4 max-w-2xl">
        Os botões &ldquo;Ver se minha data está livre&rdquo; levam ao <b className="text-text-primary">número da Margot</b>, o mesmo
        cadastrado na Meta. O número abaixo é só a reserva: vale quando a Meta não responde.
      </p>
      <div className="flex flex-wrap gap-3 max-w-md">
        <input
          type="tel"
          value={currentNumber}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Ex: 5554999999999"
          className="flex-1 min-w-0 min-h-11 bg-bg-elevated border border-border-subtle text-text-primary placeholder:text-text-muted px-4 py-2.5 rounded font-sans text-[15px] focus:outline-none focus:border-gold/50 transition-colors"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gold hover:bg-gold-light disabled:opacity-40 text-bg-primary font-sans font-semibold text-sm tracking-wide min-h-11 px-5 py-2.5 rounded transition-colors uppercase cursor-pointer whitespace-nowrap"
        >
          {saved ? "Salvo ✓" : saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
      <p className="mt-2 font-sans text-sm text-text-muted">
        Número de reserva. Formato: código do país + DDD + número, sem espaços ou traços.
      </p>
    </AdminSection>
  );
}
