"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatBRL } from "@/lib/gestor/rules";
import { AdminHeader, api, Button, ErrorNote, Field, inputClass, Panel } from "@/components/gestor/ui";

interface Service {
  id: number;
  name: string;
  priceCents: number;
  isAddon: boolean;
  active: boolean;
}

const SOURCES = [
  { value: "instagram", label: "Instagram" },
  { value: "indicacao", label: "Indicação (fotógrafo, videomaker)" },
  { value: "cerimonialista", label: "Cerimonialista" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

const AVAILABILITY_TEXT: Record<string, { text: string; tone: string }> = {
  livre: { text: "Data livre", tone: "text-emerald-300" },
  provisoria: { text: "Data em reserva provisória de outro pedido", tone: "text-amber-300" },
  ocupada: { text: "Data já reservada", tone: "text-red-300" },
};

export default function NewOrderPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    source: "instagram",
    referredBy: "",
    eventDate: "",
    eventTime: "",
    venue: "",
    city: "",
    notes: "",
  });
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["gestor-servicos"],
    queryFn: () => api("/api/admin/gestor/servicos"),
  });

  useEffect(() => {
    // Pré-seleciona o serviço principal.
    if (services.length && serviceIds.length === 0) {
      const main = services.find((s) => s.active && !s.isAddon);
      if (main) setServiceIds([main.id]);
    }
  }, [services]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: availability } = useQuery<{ status: string; passado: boolean }>({
    queryKey: ["gestor-disp", form.eventDate],
    queryFn: () => api(`/api/admin/gestor/disponibilidade?data=${form.eventDate}`),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(form.eventDate),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleService = (id: number) =>
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await api<{ order: { id: number } }>("/api/admin/gestor/pedidos", {
        body: {
          client: { name: form.name, phone: form.phone, source: form.source, referredBy: form.referredBy },
          eventDate: form.eventDate || null,
          eventTime: form.eventTime,
          venue: form.venue,
          city: form.city,
          notes: form.notes,
          serviceIds,
        },
      });
      router.push(`/admin/pedidos/${result.order.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const total = services.filter((s) => serviceIds.includes(s.id)).reduce((sum, s) => sum + s.priceCents, 0);

  return (
    <div className="min-h-screen bg-bg-primary">
      <AdminHeader active="pedido" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link href="/admin/dashboard" className="text-sm text-text-muted hover:text-text-primary">
          ← Voltar à gestão
        </Link>
        <h1 className="font-serif text-3xl text-text-primary mt-3 mb-6">Novo pedido</h1>

        <form onSubmit={submit} className="space-y-6">
          <Panel title="Cliente">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome">
                <input required value={form.name} onChange={set("name")} className={inputClass} autoComplete="off" />
              </Field>
              <Field label="WhatsApp" hint="Com DDD. Se já existir, o cadastro é reaproveitado.">
                <input required inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="(54) 99999-9999" className={inputClass} />
              </Field>
              <Field label="Como chegou">
                <select value={form.source} onChange={set("source")} className={inputClass}>
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quem indicou">
                <input value={form.referredBy} onChange={set("referredBy")} className={inputClass} />
              </Field>
            </div>
          </Panel>

          <Panel title="Evento">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Data">
                <input type="date" value={form.eventDate} onChange={set("eventDate")} className={inputClass} />
                {availability && (
                  <span className={`block text-xs ${availability.passado ? "text-red-300" : AVAILABILITY_TEXT[availability.status]?.tone}`}>
                    {availability.passado ? "Essa data já passou" : AVAILABILITY_TEXT[availability.status]?.text}
                  </span>
                )}
              </Field>
              <Field label="Horário">
                <input type="time" value={form.eventTime} onChange={set("eventTime")} className={inputClass} />
              </Field>
              <Field label="Local da cerimônia">
                <input value={form.venue} onChange={set("venue")} className={inputClass} />
              </Field>
              <Field label="Cidade">
                <input value={form.city} onChange={set("city")} className={inputClass} />
              </Field>
            </div>
          </Panel>

          <Panel title="Serviços">
            <div className="space-y-2">
              {services
                .filter((s) => s.active)
                .map((s) => (
                  <label key={s.id} className="flex items-center gap-3 bg-bg-elevated border border-border-subtle rounded px-3 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serviceIds.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                      className="w-4 h-4 accent-gold"
                    />
                    <span className="flex-1 text-sm text-text-primary">{s.name}</span>
                    <span className="text-sm text-text-secondary">
                      {s.isAddon ? "+ " : ""}
                      {formatBRL(s.priceCents)}
                    </span>
                  </label>
                ))}
            </div>
            <p className="text-sm text-text-secondary mt-3">
              Total estimado: <span className="text-gold font-serif text-lg">{formatBRL(total)}</span>
            </p>
            <Field label="Observações" className="mt-4">
              <textarea rows={3} value={form.notes} onChange={set("notes")} className={`${inputClass} resize-none`} />
            </Field>
          </Panel>

          <ErrorNote message={error} />
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? "Criando…" : "Criar pedido"}
          </Button>
        </form>
      </main>
    </div>
  );
}
