"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBRL, formatDateBR, parseBRLToCents, SETTING_LABELS, type Settings } from "@/lib/gestor/rules";
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
        <GoogleCard />
        <ServicesEditor />
        <SettingsEditor />
      </main>
    </div>
  );
}

interface GoogleStatus {
  configurada: boolean;
  motivo?: string;
  ok?: boolean;
  erro?: string | null;
  contaDeServico?: string;
  diasOcupados?: number;
  proximos?: { date: string; summary: string }[];
}

function GoogleCard() {
  const { data, refetch, isFetching } = useQuery<GoogleStatus>({
    queryKey: ["google-status"],
    queryFn: () => api("/api/admin/gestor/google"),
  });
  const [msg, setMsg] = useState<string | null>(null);

  async function sendPending() {
    setMsg(null);
    try {
      const r = await api<{ enviados: number }>("/api/admin/gestor/google", { body: {} });
      setMsg(r.enviados ? `${r.enviados} evento(s) enviado(s) para a agenda.` : "Nada pendente: a agenda já está em dia.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Panel
      title="Google Agenda"
      action={
        <Button variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Testando…" : "Testar conexão"}
        </Button>
      }
    >
      {!data ? (
        <Loading />
      ) : !data.configurada ? (
        <p className="text-sm text-text-secondary">
          Ainda não conectada. {data.motivo} Depois de conectada, tudo o que estiver na sua agenda bloqueia o dia para a Margot e
          no site, e cada casamento confirmado aparece na agenda sozinho.
        </p>
      ) : data.ok ? (
        <div className="space-y-2 text-sm">
          <p className="text-emerald-300">Conectada. {data.diasOcupados} dia(s) ocupado(s) nos próximos 2 anos.</p>
          {data.proximos && data.proximos.length > 0 && (
            <ul className="text-text-secondary">
              {data.proximos.map((d) => (
                <li key={d.date}>
                  {formatDateBR(d.date)} · {d.summary}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-text-muted">
            Só compromissos únicos bloqueiam o dia. Eventos que se repetem (rotina, trabalho, aniversários) são ignorados.
            Para um compromisso único não bloquear, marque-o como "Disponível" na Google Agenda.
          </p>
          <Button variant="ghost" onClick={sendPending}>
            Enviar pedidos confirmados para a agenda
          </Button>
          {msg && <p className="text-sm text-text-secondary">{msg}</p>}
        </div>
      ) : (
        <div className="space-y-1 text-sm">
          <p className="text-red-300">Configurada, mas o Google recusou: {data.erro}</p>
          <p className="text-text-muted">
            Confira se a agenda foi compartilhada com {data.contaDeServico} com a permissão "Fazer alterações nos eventos".
          </p>
        </div>
      )}
    </Panel>
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

type FieldSpec = { key: keyof Settings; kind: "number" | "decimal" | "text" | "long"; hint?: string };

const GROUPS: { title: string; note?: string; fields: FieldSpec[] }[] = [
  {
    title: "Políticas",
    fields: [
      { key: "depositPercent", kind: "number" },
      { key: "balanceDaysBefore", kind: "number" },
      { key: "provisionalHours", kind: "number" },
      { key: "followUpDays", kind: "number" },
      { key: "cancellationPolicy", kind: "long", hint: "Vai no termo e a Margot usa para responder." },
      { key: "serviceArea", kind: "long", hint: "Se vazio, a Margot encaminha essa pergunta para você." },
    ],
  },
  {
    title: "Margot",
    fields: [
      { key: "margotLimitUsd", kind: "number", hint: "Ao atingir, o chat mostra seu WhatsApp. 0 desliga a Margot." },
      { key: "dollarRate", kind: "decimal", hint: "Só para mostrar o gasto em reais no Financeiro." },
    ],
  },
  {
    title: "Termo e proposta",
    note: "Esses dados aparecem no Termo Simplificado que o painel gera. Ficam só no banco do site, nunca no código.",
    fields: [
      { key: "contractorName", kind: "text" },
      { key: "contractorDocument", kind: "text" },
      { key: "pixKey", kind: "text" },
      { key: "forum", kind: "text" },
      { key: "proposalValidityDays", kind: "number" },
    ],
  },
];

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
    <>
      {GROUPS.map((g) => (
        <Panel key={g.title} title={g.title}>
          {g.note && <p className="text-sm text-text-muted -mt-2 mb-4">{g.note}</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            {g.fields.map((f) => (
              <Field key={f.key} label={SETTING_LABELS[f.key]} hint={f.hint} className={f.kind === "long" ? "sm:col-span-2" : ""}>
                {f.kind === "long" ? (
                  <textarea
                    rows={3}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className={`${inputClass} resize-none`}
                  />
                ) : (
                  <input
                    inputMode={f.kind === "number" ? "numeric" : f.kind === "decimal" ? "decimal" : "text"}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className={inputClass}
                  />
                )}
              </Field>
            ))}
          </div>
        </Panel>
      ))}
      <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-bg-primary/95 backdrop-blur space-y-3">
        <ErrorNote message={error} />
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saved ? "Salvo" : saving ? "Salvando…" : "Salvar regras"}
        </Button>
      </div>
    </>
  );
}
