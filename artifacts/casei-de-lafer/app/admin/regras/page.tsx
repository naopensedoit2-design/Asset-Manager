"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBRL, formatDateBR, parseBRLToCents, SETTING_LABELS, type Settings } from "@/lib/gestor/rules";
import { api, Button, ErrorNote, Field, inputClass, Loading, Panel } from "@/components/gestor/ui";
import { accountModeText, canSendText, nameStatusText, type PhoneHealth } from "@/lib/wa/health";

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
    <div>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="font-serif text-3xl text-text-primary">Margot e regras</h1>
          <p className="text-sm text-text-secondary mt-1">
            Preços e políticas usados pelo painel e pela Margot. Mudou aqui, vale para os próximos orçamentos.
          </p>
        </div>
        <nav aria-label="Ir para" className="sticky top-14 lg:top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 bg-bg-primary/95 backdrop-blur flex gap-2 overflow-x-auto">
          {SECTIONS.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="shrink-0 inline-flex min-h-10 items-center rounded-full border border-border-subtle px-3.5 text-sm text-text-secondary transition-colors hover:border-border-gold hover:text-text-primary"
            >
              {sec.label}
            </a>
          ))}
        </nav>
        <div id="agenda" className="scroll-mt-28">
          <GoogleCard />
        </div>
        <div id="whatsapp" className="scroll-mt-28">
          <WhatsAppCard />
        </div>
        <div id="servicos" className="scroll-mt-28">
          <ServicesEditor />
        </div>
        <SettingsEditor />
      </main>
    </div>
  );
}

/** Atalhos do topo. Os ids das políticas vêm de GROUPS (g-<id>). */
const SECTIONS = [
  { id: "agenda", label: "Agenda" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "servicos", label: "Serviços e preços" },
  { id: "g-politicas", label: "Políticas" },
  { id: "g-margot", label: "Margot" },
  { id: "g-whatsapp", label: "Seu número" },
  { id: "g-termo", label: "Termo" },
];

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
          <p className="text-ok">Conectada. {data.diasOcupados} dia(s) ocupado(s) nos próximos 2 anos.</p>
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
          <p className="text-bad">Configurada, mas o Google recusou: {data.erro}</p>
          <p className="text-text-muted">
            Confira se a agenda foi compartilhada com {data.contaDeServico} com a permissão "Fazer alterações nos eventos".
          </p>
        </div>
      )}
    </Panel>
  );
}

interface WaStatus {
  configurado: boolean;
  faltando: string[];
  numero: {
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
    code_verification_status?: string;
    name_status?: string;
    status?: string;
  } | null;
  /** Pode enviar? Pedido de novo nome e tipo do número (a Meta pode não devolver cada um). */
  saude: { health: PhoneHealth | null; newNameStatus: string; accountMode: string } | null;
  erro: string | null;
  webhookUrl: string;
  ultimoWebhook: string | null;
  dono: string | null;
  voz: boolean;
  modelo: string;
  temWaba: boolean;
}

const ENVIO_TOM = { ok: "text-ok", warn: "text-warn", bad: "text-bad", none: "text-text-muted" } as const;

const GUIDE_URL = "https://github.com/naopensedoit2-design/Asset-Manager/blob/main/docs/whatsapp.md";

function WhatsAppCard() {
  const { data, refetch, isFetching } = useQuery<WaStatus>({
    queryKey: ["wa-status"],
    queryFn: () => api("/api/admin/whatsapp/status"),
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function act(acao: string) {
    setBusy(acao);
    setMsg(null);
    setErr(null);
    try {
      const r = await api<{ mensagem: string }>("/api/admin/whatsapp/status", { body: { acao, pin } });
      setMsg(r.mensagem);
      refetch();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const n = data?.numero;
  const envio = canSendText(data?.saude?.health);
  return (
    <Panel
      title="WhatsApp da Margot"
      action={
        <Button variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Conferindo…" : "Conferir"}
        </Button>
      }
    >
      {!data ? (
        <Loading />
      ) : !data.configurado ? (
        <div className="space-y-3 text-sm">
          <p className="text-text-secondary">
            Ainda não conectado. Faltam na Vercel: <span className="text-text-primary">{data.faltando.join(", ")}</span>.
          </p>
          <p className="text-text-muted">
            Siga o{" "}
            <a href={GUIDE_URL} target="_blank" rel="noreferrer" className="text-gold underline underline-offset-2">
              passo a passo da Meta
            </a>
            . Quando pedir a URL do webhook, use:
          </p>
          <code className="block bg-bg-elevated rounded px-3 py-2 text-xs text-text-primary break-all">{data.webhookUrl}</code>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          {data.erro ? (
            <p className="text-bad">Configurado, mas a Meta recusou: {data.erro}</p>
          ) : (
            <p className="text-ok">
              Conectado{n?.display_phone_number ? ` ao ${n.display_phone_number}` : ""}
              {n?.verified_name ? ` (${n.verified_name})` : ""}.
            </p>
          )}
          <ul className="text-text-secondary space-y-1">
            {n?.quality_rating && <li>Qualidade do número: {n.quality_rating === "GREEN" ? "boa" : n.quality_rating === "YELLOW" ? "atenção" : n.quality_rating === "RED" ? "ruim" : n.quality_rating}</li>}
            {n?.name_status && <li>Nome de exibição: {nameStatusText(n.name_status)}</li>}
            {data.saude?.newNameStatus && <li>Pedido de novo nome: {nameStatusText(data.saude.newNameStatus)}</li>}
            {data.saude?.accountMode && <li>Tipo de número: {accountModeText(data.saude.accountMode)}</li>}
            {!data.erro && (
              <li>
                Pode enviar: <span className={ENVIO_TOM[envio.tone]}>{envio.text}</span>
              </li>
            )}
            {data.saude?.health?.issues.map((i, k) => (
              <li key={k} className="text-text-muted">
                Meta{i.code ? ` (${i.code})` : ""}: {i.text}
                {i.solution ? ` Solução sugerida: ${i.solution}` : ""}
              </li>
            ))}
            <li>Última mensagem recebida: {data.ultimoWebhook ? new Date(data.ultimoWebhook).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "nenhuma ainda"}</li>
            <li>Seu WhatsApp (modo secretária): {data.dono ?? <span className="text-warn">preencha abaixo, em "Seu número e avisos"</span>}</li>
            <li>Áudio (ouvir e falar): {data.voz ? "ligado" : "desligado (falta VOICE_API_KEY)"}</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => act("teste")} disabled={!!busy}>
              {busy === "teste" ? "Enviando…" : "Mandar teste para mim"}
            </Button>
            {data.temWaba && (
              <Button variant="ghost" onClick={() => act("assinar")} disabled={!!busy}>
                {busy === "assinar" ? "Assinando…" : "Assinar webhooks"}
              </Button>
            )}
          </div>
          <details className="text-text-muted">
            <summary className="cursor-pointer text-text-secondary">Registrar o número na API (só uma vez)</summary>
            <p className="mt-2">
              Depois de verificar o número pelo SMS na Meta, escolha um PIN de 6 números. Ele vira a confirmação em duas etapas do
              número: guarde-o.
            </p>
            <div className="flex gap-2 mt-2">
              <input
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="PIN de 6 números"
                className={`${inputClass} max-w-48`}
              />
              <Button variant="ghost" onClick={() => act("registrar")} disabled={!!busy || pin.length !== 6}>
                {busy === "registrar" ? "Registrando…" : "Registrar"}
              </Button>
            </div>
          </details>
          <p className="text-xs text-text-muted">
            Webhook: <span className="break-all">{data.webhookUrl}</span> ·{" "}
            <a href={GUIDE_URL} target="_blank" rel="noreferrer" className="text-gold underline underline-offset-2">
              guia
            </a>
          </p>
        </div>
      )}
      {msg && <p className="text-sm text-ok mt-3">{msg}</p>}
      <ErrorNote message={err} />
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
    <div className={`bg-bg-elevated border rounded p-4 space-y-3 ${form.active ? "border-border-subtle" : "border-dashed border-border opacity-70"}`}>
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

type FieldSpec = { key: keyof Settings; kind: "number" | "decimal" | "text" | "long" | "bool"; hint?: string };

const GROUPS: { id: string; title: string; note?: string; fields: FieldSpec[] }[] = [
  {
    id: "politicas",
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
    id: "margot",
    title: "Margot",
    fields: [
      { key: "margotLimitUsd", kind: "number", hint: "Ao atingir, o chat mostra seu WhatsApp. 0 desliga a Margot." },
      { key: "margotSite", kind: "bool", hint: "Desligado: o chat do site manda a pessoa para o seu WhatsApp." },
      { key: "dollarRate", kind: "decimal", hint: "Só para mostrar o gasto em reais no Financeiro." },
    ],
  },
  {
    id: "whatsapp",
    title: "Seu número e avisos",
    note: "Quando o seu número escreve para o número da Margot, ela vira sua secretária (resumo, agenda, pedidos, despesas).",
    fields: [
      { key: "ownerPhone", kind: "text", hint: "Com DDD. É o número que recebe os avisos e fala com a Margot no modo secretária." },
      { key: "margotWhatsapp", kind: "bool", hint: "Desligado: as mensagens dos clientes só chegam para você." },
      { key: "ownerDailySummary", kind: "bool", hint: "Só quando há algo para ver: evento perto, alerta ou conversa esperando." },
    ],
  },
  {
    id: "termo",
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
        <div key={g.title} id={`g-${g.id}`} className="scroll-mt-28">
        <Panel title={g.title}>
          {g.note && <p className="text-sm text-text-secondary -mt-2 mb-4">{g.note}</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            {g.fields.map((f) => (
              <Field key={f.key} label={SETTING_LABELS[f.key]} hint={f.hint} className={f.kind === "long" ? "sm:col-span-2" : ""}>
                {f.kind === "bool" ? (
                  <span className="flex items-center gap-3 py-1.5">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-gold cursor-pointer"
                      checked={form[f.key] === "true" || form[f.key] === "1"}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.checked ? "true" : "false" })}
                    />
                    <span className="text-sm text-text-primary">{form[f.key] === "true" || form[f.key] === "1" ? "Ligado" : "Desligado"}</span>
                  </span>
                ) : f.kind === "long" ? (
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
        </div>
      ))}
      <div className="sticky bottom-[var(--tabbar-h)] -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-bg-primary/95 backdrop-blur space-y-3 z-20">
        <ErrorNote message={error} />
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saved ? "Salvo" : saving ? "Salvando…" : "Salvar regras"}
        </Button>
      </div>
    </>
  );
}
