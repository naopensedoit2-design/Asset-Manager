"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBRL, parseBRLToCents, SETTING_LABELS, type Settings } from "@/lib/gestor/rules";
import { AdminHeader, api, Button, ErrorNote, Field, inputClass, Loading, Panel } from "@/components/gestor/ui";

interface Service {
  id?: number;
  name: string;
  description: string;
  priceCents: number;
  isAddon: boolean;
  active: boolean;
  sortOrder: number;
}

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <AdminHeader active="regras" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="font-serif text-3xl text-text-primary">Regras do negócio</h1>
          <p className="text-sm text-text-muted mt-1">
            Preços e políticas usados pelo painel e pela Margot. Mudou aqui, vale para os próximos orçamentos.
          </p>
        </div>
        <ServicesEditor />
        <SettingsEditor />
      </main>
    </div>
  );
}

function ServicesEditor() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<Service[]>({
    queryKey: ["gestor-servicos"],
    queryFn: () => api("/api/admin/gestor/servicos"),
  });
  const [adding, setAdding] = useState(false);

  if (isLoading) return <Loading />;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["gestor-servicos"] });

  return (
    <Panel
      title="Serviços e preços"
      action={
        !adding ? (
          <Button variant="ghost" onClick={() => setAdding(true)}>
            Novo serviço
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {data?.map((s) => <ServiceRow key={s.id} service={s} onSaved={refresh} />)}
        {adding && (
          <ServiceRow
            service={{ name: "", description: "", priceCents: 0, isAddon: true, active: true, sortOrder: (data?.length ?? 0) + 1 }}
            onSaved={() => {
              setAdding(false);
              refresh();
            }}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>
    </Panel>
  );
}

function ServiceRow({ service, onSaved, onCancel }: { service: Service; onSaved: () => void; onCancel?: () => void }) {
  const [form, setForm] = useState({ ...service, price: service.priceCents ? (service.priceCents / 100).toFixed(2).replace(".", ",") : "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    const priceCents = parseBRLToCents(form.price);
    if (priceCents === null) return setError("Informe o preço.");
    setSaving(true);
    setError(null);
    try {
      await api("/api/admin/gestor/servicos", { body: { ...form, priceCents } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`bg-bg-elevated border rounded p-4 space-y-3 ${form.active ? "border-border-subtle" : "border-dashed border-white/10 opacity-70"}`}>
      <div className="grid grid-cols-[1fr_8rem] gap-3">
        <Field label="Nome">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Preço (R$)">
          <input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} />
        </Field>
      </div>
      <Field label="Descrição">
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-gold" checked={form.isAddon} onChange={(e) => setForm({ ...form, isAddon: e.target.checked })} />
          É um adicional
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-gold" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Ativo
        </label>
        <span className="text-text-muted ml-auto">Atual: {formatBRL(service.priceCents)}</span>
      </div>
      <ErrorNote message={error} />
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saved ? "Salvo" : saving ? "Salvando…" : "Salvar"}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

const NUMBER_KEYS: (keyof Settings)[] = ["depositPercent", "balanceDaysBefore", "provisionalHours", "followUpDays"];
const TEXT_KEYS: (keyof Settings)[] = ["cancellationPolicy", "serviceArea"];

function SettingsEditor() {
  const queryClient = useQueryClient();
  const { data } = useQuery<Settings>({ queryKey: ["gestor-regras"], queryFn: () => api("/api/admin/gestor/regras") });
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])));
  }, [data]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const next = await api<Settings>("/api/admin/gestor/regras", { method: "PUT", body: form });
      queryClient.setQueryData(["gestor-regras"], next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <Loading />;

  return (
    <Panel title="Políticas">
      <div className="grid sm:grid-cols-2 gap-4">
        {NUMBER_KEYS.map((k) => (
          <Field key={k} label={SETTING_LABELS[k]}>
            <input inputMode="numeric" value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={inputClass} />
          </Field>
        ))}
        {TEXT_KEYS.map((k) => (
          <Field
            key={k}
            label={SETTING_LABELS[k]}
            className="sm:col-span-2"
            hint={!form[k] ? "Ainda não definido. A Margot vai encaminhar essas perguntas para você." : undefined}
          >
            <textarea rows={3} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={`${inputClass} resize-none`} />
          </Field>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        <ErrorNote message={error} />
        <Button onClick={save} disabled={saving}>
          {saved ? "Salvo" : saving ? "Salvando…" : "Salvar políticas"}
        </Button>
      </div>
    </Panel>
  );
}
