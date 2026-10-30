"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { EXPENSE_CATEGORIES, type FinanceSummary } from "@/lib/gestor/finance";
import { formatBRL, formatDateBR, parseBRLToCents, todayISO } from "@/lib/gestor/rules";
import type { ExpenseView } from "@/lib/gestor/finance-service";
import { api, Button, ErrorNote, Field, inputClass, Loading, Panel } from "@/components/gestor/ui";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_FULL = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

type Tab = "resumo" | "contas" | "pagas";

const TABS: { key: Tab; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "contas", label: "A pagar" },
  { key: "pagas", label: "Pagas" },
];

export default function FinanceiroPage() {
  return (
    <Suspense fallback={<div />}>
      <FinanceiroView />
    </Suspense>
  );
}

function FinanceiroView() {
  const today = todayISO();
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("aba");
  const tab: Tab = raw === "contas" || raw === "pagas" ? raw : "resumo";
  const setTab = (t: Tab) => router.replace(t === "resumo" ? "/admin/financeiro" : `/admin/financeiro?aba=${t}`, { scroll: false });
  const [year, setYear] = useState(today.slice(0, 4));
  const [month, setMonth] = useState<string | null>(null);
  const period = month ? `${year}-${month}` : year;
  const label = month ? `${MONTHS_FULL[Number(month) - 1]} de ${year}` : year;

  const { data: summary, error } = useQuery<FinanceSummary>({
    queryKey: ["financeiro", period],
    queryFn: () => api(`/api/admin/gestor/financeiro?periodo=${period}`),
  });
  const { data: expenses } = useQuery<ExpenseView[]>({
    queryKey: ["despesas", period],
    queryFn: () => api(`/api/admin/gestor/despesas?periodo=${period}`),
  });
  const { data: services = [] } = useQuery<{ name: string; priceCents: number; isAddon: boolean }[]>({
    queryKey: ["gestor-servicos"],
    queryFn: () => api("/api/admin/gestor/servicos"),
  });
  const weddingPrice = services.find((s) => !s.isAddon && /noiva/i.test(s.name))?.priceCents ?? 260000;

  const years = [String(Number(today.slice(0, 4)) - 1), today.slice(0, 4), String(Number(today.slice(0, 4)) + 1)];
  const openCount = (expenses ?? []).filter((e) => e.status === "a_pagar").length;

  return (
    <div>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-4xl text-text-primary">Dinheiro</h1>
            <p className="text-sm text-text-secondary mt-1">{tab === "contas" ? "Contas em aberto, de qualquer mês" : `Caixa de ${label}`}</p>
          </div>
          {tab !== "contas" && (
            <select
              aria-label="Ano"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="bg-bg-elevated border border-border-subtle text-text-primary rounded px-3 py-2 text-sm min-h-11"
            >
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          )}
        </div>

        <div role="tablist" aria-label="Seções do dinheiro" className="grid grid-cols-3 gap-1 rounded-lg border border-border-subtle bg-bg-card p-1">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.key)}
                className={`min-h-11 rounded-md text-sm transition-colors cursor-pointer ${
                  on ? "bg-gold text-bg-primary font-semibold" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t.label}
                {t.key === "contas" && openCount > 0 ? ` (${openCount})` : ""}
              </button>
            );
          })}
        </div>

        {tab !== "contas" && (
          <div className="-mx-4 sm:mx-0 px-4 sm:px-0 flex gap-1.5 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible" role="group" aria-label="Período">
            <PeriodChip on={!month} onClick={() => setMonth(null)}>
              Ano inteiro
            </PeriodChip>
            {MONTHS.map((m, i) => {
              const key = String(i + 1).padStart(2, "0");
              return (
                <PeriodChip key={m} on={month === key} onClick={() => setMonth(key)}>
                  {m}
                </PeriodChip>
              );
            })}
          </div>
        )}

        {tab === "resumo" && (
          <>
            {error && <ErrorNote message={(error as Error).message} />}
            {!summary ? (
              <Loading />
            ) : (
              <>
                <Totals s={summary} />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                  <VehicleCost s={summary} weddingPrice={weddingPrice} label={label} className="lg:col-span-2" />
                  <Categories s={summary} className="lg:col-span-3" />
                </div>
                <MargotCost />
                {summary.meses.length > 0 && <Monthly s={summary} today={today} onPick={(m) => setMonth(m)} />}
              </>
            )}
          </>
        )}

        {tab !== "resumo" && <Expenses expenses={expenses} period={period} view={tab} />}
      </main>
    </div>
  );
}

function PeriodChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-pressed={on}
      onClick={onClick}
      className={`shrink-0 min-h-10 rounded-full px-3.5 text-sm border transition-colors cursor-pointer ${
        on ? "bg-gold text-bg-primary border-gold font-semibold" : "border-border-subtle text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Totais ──────────────────────────────────────────────────

function Totals({ s }: { s: FinanceSummary }) {
  const positive = s.resultadoCents >= 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Tile label="Entrou" value={formatBRL(s.entrouCents)} hint="sinais e saldos recebidos" />
        <Tile label="Saiu" value={formatBRL(s.saiuCents)} hint="despesas pagas" />
        <div
          className={`col-span-2 sm:col-span-1 rounded-lg border p-3 sm:p-4 ${
            positive ? "border-ok/40 bg-ok/5" : "border-bad/50 bg-bad/10"
          }`}
        >
          <p className="text-xs sm:text-sm text-text-secondary">Resultado</p>
          <p className={`font-serif text-2xl sm:text-3xl mt-1 ${positive ? "text-ok" : "text-bad"}`}>
            {positive ? "" : "− "}
            {formatBRL(Math.abs(s.resultadoCents))}
          </p>
          <p className="text-[11px] text-text-muted">{positive ? "sobrou no caixa" : "saiu mais do que entrou"}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/admin/financeiro?aba=contas"
          className={`block rounded-lg border p-3 transition-colors hover:border-border-gold ${s.aPagarVencidoCents > 0 ? "border-bad/50 bg-bad/10" : "border-border-subtle bg-bg-card"}`}
        >
          <p className="text-xs text-text-secondary">A pagar</p>
          <p className="font-serif text-xl sm:text-2xl text-text-primary">{formatBRL(s.aPagarCents)}</p>
          {s.aPagarVencidoCents > 0 ? <p className="text-[11px] text-bad">{formatBRL(s.aPagarVencidoCents)} vencido</p> : <p className="text-[11px] text-text-muted">ver as contas</p>}
        </Link>
        <div className="rounded-lg border border-border-subtle bg-bg-card p-3">
          <p className="text-xs text-text-secondary">A receber</p>
          <p className="font-serif text-xl sm:text-2xl text-text-primary">{formatBRL(s.aReceberCents)}</p>
          <p className="text-[11px] text-text-muted">sinais e saldos de clientes</p>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border-gold bg-gold-muted/40 p-3 sm:p-4">
      <p className="text-xs sm:text-sm text-text-secondary">{label}</p>
      <p className="font-serif text-2xl sm:text-3xl mt-1 text-gold">{value}</p>
      <p className="text-[11px] text-text-muted">{hint}</p>
    </div>
  );
}

// ─── Custo do carro ──────────────────────────────────────────

function VehicleCost({ s, weddingPrice, label, className }: { s: FinanceSummary; weddingPrice: number; label: string; className?: string }) {
  const weddings = s.custoVeiculoCents / weddingPrice;
  return (
    <Panel title="Custo do Lafer" className={className}>
      <p className="font-serif text-4xl text-text-primary">{formatBRL(s.custoVeiculoCents)}</p>
      <p className="text-sm text-text-secondary mt-2">
        Manutenção, guincho, combustível, seguro e estética em {label}, incluindo o que ainda falta pagar.
      </p>
      {s.custoVeiculoCents > 0 && (
        <p className="text-sm text-gold mt-3">
          Equivale a {weddings < 1 ? "menos de 1" : weddings.toFixed(1).replace(".", ",")} Carro{weddings >= 2 ? "s" : ""} da Noiva.
        </p>
      )}
      {s.custoPorEventoCents !== null && (
        <p className="text-sm text-text-muted mt-1">
          {s.eventos} evento{s.eventos > 1 ? "s" : ""} confirmado{s.eventos > 1 ? "s" : ""}: custo total de {formatBRL(s.custoPorEventoCents)} por evento.
        </p>
      )}
    </Panel>
  );
}

// ─── Custo da Margot ─────────────────────────────────────────

interface MargotUsage {
  usd: number;
  conversas: number;
  chamadas: number;
  limiteUsd: number;
  cotacao: number;
  ligada: boolean;
  temChave: boolean;
  modelo: string;
  porCanal?: { site: number; whatsapp: number };
}

const usdFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" });

function MargotCost() {
  const { data } = useQuery<MargotUsage>({ queryKey: ["margot-uso"], queryFn: () => api("/api/admin/gestor/margot-uso") });
  if (!data) return null;
  const pct = data.limiteUsd > 0 ? Math.min(100, (data.usd / data.limiteUsd) * 100) : 100;
  const perConversation = data.conversas > 0 ? data.usd / data.conversas : null;
  const status = !data.temChave
    ? { text: "Desligada: falta a chave da API na Vercel", tone: "text-text-muted" }
    : data.limiteUsd <= 0
      ? { text: "Desligada nas Regras (limite zero)", tone: "text-text-muted" }
      : !data.ligada
        ? { text: "Pausada: limite do mês atingido", tone: "text-bad" }
        : { text: "Atendendo no site e no WhatsApp", tone: "text-ok" };
  return (
    <Panel title="Margot (IA) neste mês">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-serif text-3xl text-text-primary">{usdFmt.format(data.usd)}</p>
          <p className="text-sm text-text-secondary">
            ≈ {formatBRL(Math.round(data.usd * data.cotacao * 100))} · {data.conversas} conversa{data.conversas === 1 ? "" : "s"}
            {perConversation !== null && ` · ${usdFmt.format(perConversation)} por conversa`}
          </p>
          {data.porCanal && (data.porCanal.whatsapp > 0 || data.porCanal.site > 0) && (
            <p className="text-xs text-text-muted mt-1">
              Site {usdFmt.format(data.porCanal.site)} · WhatsApp {usdFmt.format(data.porCanal.whatsapp)}
            </p>
          )}
        </div>
        <p className={`text-sm ${status.tone}`}>{status.text}</p>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>Usado do limite mensal</span>
          <span className="tabular-nums">
            {usdFmt.format(data.usd)} de {usdFmt.format(data.limiteUsd)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 90 ? "bg-bad" : "bg-gold"}`} style={{ width: `${Math.max(1, pct)}%` }} />
        </div>
        <p className="text-xs text-text-muted mt-2">
          Estimativa pelos preços oficiais do modelo {data.modelo}. Ao bater o limite, o chat do site mostra o botão do seu
          WhatsApp e, no WhatsApp, a Margot só avisa que você responde em breve. O limite e a cotação do dólar ficam em Regras.
        </p>
      </div>
    </Panel>
  );
}

// ─── Por categoria ───────────────────────────────────────────

function Categories({ s, className }: { s: FinanceSummary; className?: string }) {
  const max = Math.max(1, ...s.porCategoria.map((c) => c.cents));
  return (
    <Panel title="Para onde foi o dinheiro" className={className}>
      {s.porCategoria.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhuma despesa no período.</p>
      ) : (
        <ul className="space-y-3">
          {s.porCategoria.map((c) => (
            <li key={c.key} title={`${c.label}: ${formatBRL(c.cents)}`}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-text-secondary">{c.label}</span>
                <span className="text-text-primary tabular-nums">{formatBRL(c.cents)}</span>
              </div>
              <div className="h-2 mt-1.5 rounded-full bg-bg-elevated overflow-hidden">
                <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(2, (c.cents / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ─── Mês a mês ───────────────────────────────────────────────

function Monthly({ s, today, onPick }: { s: FinanceSummary; today: string; onPick: (m: string) => void }) {
  const rows = s.meses.filter((m) => m.entrouCents || m.saiuCents || m.mes === today.slice(0, 7));
  return (
    <Panel title="Mês a mês">
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">Sem movimento neste ano.</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {rows.map((m) => {
            const r = m.entrouCents - m.saiuCents;
            return (
              <li key={m.mes}>
                <button
                  onClick={() => onPick(m.mes.slice(5))}
                  className="w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer hover:opacity-80"
                >
                  <div>
                    <p className="text-sm text-text-primary capitalize">{MONTHS_FULL[Number(m.mes.slice(5)) - 1]}</p>
                    <p className="text-xs text-text-muted tabular-nums">
                      entrou {formatBRL(m.entrouCents)} · saiu {formatBRL(m.saiuCents)}
                    </p>
                  </div>
                  <span className={`font-serif text-lg tabular-nums ${r > 0 ? "text-ok" : r < 0 ? "text-bad" : "text-text-muted"}`}>
                    {r === 0 ? "—" : `${r < 0 ? "− " : "+ "}${formatBRL(Math.abs(r))}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ─── Despesas ────────────────────────────────────────────────

type Draft = {
  id?: number;
  date: string;
  description: string;
  category: string;
  supplier: string;
  amount: string;
  status: "pago" | "a_pagar";
  dueDate: string;
  paidAt: string;
  notes: string;
};

const emptyDraft = (): Draft => ({
  date: todayISO(),
  description: "",
  category: "manutencao",
  supplier: "",
  amount: "",
  status: "pago",
  dueDate: "",
  paidAt: "",
  notes: "",
});

const toDraft = (e: ExpenseView): Draft => ({
  id: e.id,
  date: e.date,
  description: e.description,
  category: e.category,
  supplier: e.supplier,
  amount: (e.amountCents / 100).toFixed(2).replace(".", ","),
  status: e.status === "a_pagar" ? "a_pagar" : "pago",
  dueDate: e.dueDate ?? "",
  paidAt: e.paidAt ?? "",
  notes: e.notes,
});

function Expenses({ expenses, period, view }: { expenses?: ExpenseView[]; period: string; view: "contas" | "pagas" }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["despesas"] }),
      queryClient.invalidateQueries({ queryKey: ["financeiro"] }),
    ]);

  async function save(d: Draft) {
    const amountCents = parseBRLToCents(d.amount);
    if (!amountCents) return setError("Informe o valor.");
    setBusy(true);
    setError(null);
    try {
      const body = {
        date: d.date,
        description: d.description,
        category: d.category,
        supplier: d.supplier,
        amountCents,
        status: d.status,
        dueDate: d.dueDate || null,
        paidAt: d.status === "pago" ? d.paidAt || d.date : null,
        notes: d.notes,
      };
      await api(d.id ? `/api/admin/gestor/despesas/${d.id}` : "/api/admin/gestor/despesas", {
        method: d.id ? "PATCH" : "POST",
        body,
      });
      setEditing(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pay(e: ExpenseView) {
    await save({ ...toDraft(e), status: "pago", paidAt: todayISO() });
  }

  async function remove(d: Draft) {
    if (!d.id || !window.confirm(`Excluir "${d.description}"?`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/gestor/despesas/${d.id}`, { method: "DELETE" });
      setEditing(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const open = (expenses ?? []).filter((e) => e.status === "a_pagar");
  const paid = (expenses ?? []).filter((e) => e.status !== "a_pagar" && (e.paidAt ?? e.date).startsWith(period));
  const other = (expenses ?? []).filter((e) => e.status !== "a_pagar" && !(e.paidAt ?? e.date).startsWith(period));

  return (
    <Panel
      title={view === "contas" ? "Contas a pagar" : "Despesas pagas"}
      action={
        !editing ? (
          <Button onClick={() => setEditing(emptyDraft())}>
            <Plus className="w-4 h-4" /> Lançar gasto
          </Button>
        ) : undefined
      }
    >
      {editing && !editing.id && (
        <ExpenseForm draft={editing} onChange={setEditing} onSave={save} onCancel={() => setEditing(null)} busy={busy} error={error} />
      )}

      {!expenses ? (
        <Loading />
      ) : (
        <div className="space-y-6 mt-2">
          {view === "contas" && (
            <ExpenseGroup
              title="Em aberto"
              items={open}
              empty="Nenhuma conta a pagar. Quando você lançar um gasto como “a pagar”, ele aparece aqui."
              editing={editing}
              setEditing={setEditing}
              onSave={save}
              onPay={pay}
              onRemove={remove}
              busy={busy}
              error={error}
            />
          )}
          {view === "pagas" && (
            <>
              <ExpenseGroup
                title="Pagas no período"
                items={paid}
                empty="Nenhuma despesa paga neste período."
                editing={editing}
                setEditing={setEditing}
                onSave={save}
                onRemove={remove}
                busy={busy}
                error={error}
              />
              {other.length > 0 && (
                <ExpenseGroup
                  title="Do período, pagas em outro mês"
                  items={other}
                  editing={editing}
                  setEditing={setEditing}
                  onSave={save}
                  onRemove={remove}
                  busy={busy}
                  error={error}
                />
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

function ExpenseGroup(props: {
  title: string;
  items: ExpenseView[];
  empty?: string;
  editing: Draft | null;
  setEditing: (d: Draft | null) => void;
  onSave: (d: Draft) => void;
  onPay?: (e: ExpenseView) => void;
  onRemove: (d: Draft) => void;
  busy: boolean;
  error: string | null;
}) {
  const { title, items, empty, editing, setEditing, onSave, onPay, onRemove, busy, error } = props;
  const total = items.reduce((s, e) => s + e.amountCents, 0);
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-sans text-sm font-medium text-text-primary">{title}</h3>
        {items.length > 0 && <span className="text-sm text-text-secondary tabular-nums">{formatBRL(total)}</span>}
      </div>
      {items.length === 0 && empty && <p className="text-sm text-text-muted">{empty}</p>}
      <ul className="space-y-2">
        {items.map((e) =>
          editing?.id === e.id ? (
            <li key={e.id}>
              <ExpenseForm
                draft={editing}
                onChange={setEditing}
                onSave={onSave}
                onCancel={() => setEditing(null)}
                onRemove={() => onRemove(editing)}
                busy={busy}
                error={error}
              />
            </li>
          ) : (
            <li key={e.id} className="bg-bg-elevated rounded px-3 py-3 flex flex-wrap items-center gap-3">
              <button onClick={() => setEditing(toDraft(e))} className="flex-1 min-w-[12rem] text-left cursor-pointer">
                <p className="text-sm text-text-primary">{e.description}</p>
                <p className="text-xs text-text-muted">
                  {formatDateBR(e.date)} · {e.categoryLabel}
                  {e.supplier && ` · ${e.supplier}`}
                  {e.status === "a_pagar" && e.dueDate && ` · vence ${formatDateBR(e.dueDate)}`}
                  {e.createdBy === "margot" && " · lançado pela Margot"}
                </p>
                {e.notes && <p className="text-xs text-text-muted mt-1 line-clamp-2">{e.notes}</p>}
              </button>
              <span className={`font-serif text-lg tabular-nums ${e.status === "a_pagar" ? "text-warn" : "text-text-primary"}`}>
                {formatBRL(e.amountCents)}
              </span>
              {onPay && (
                <Button onClick={() => onPay(e)} disabled={busy}>
                  Paguei
                </Button>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function ExpenseForm({
  draft,
  onChange,
  onSave,
  onCancel,
  onRemove,
  busy,
  error,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: (d: Draft) => void;
  onCancel: () => void;
  onRemove?: () => void;
  busy: boolean;
  error: string | null;
}) {
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...draft, [k]: e.target.value });

  return (
    <div className="bg-bg-elevated border border-gold/30 rounded p-4 space-y-4 mb-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="O que foi" className="sm:col-span-2">
          <input value={draft.description} onChange={set("description")} placeholder="Ex.: troca de óleo" className={inputClass} />
        </Field>
        <Field label="Valor (R$)">
          <input inputMode="decimal" value={draft.amount} onChange={set("amount")} placeholder="0,00" className={inputClass} />
        </Field>
        <Field label="Categoria">
          <select value={draft.category} onChange={set("category")} className={inputClass}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data do gasto">
          <input type="date" value={draft.date} onChange={set("date")} className={inputClass} />
        </Field>
        <Field label="Fornecedor">
          <input value={draft.supplier} onChange={set("supplier")} placeholder="Ex.: RM Nantal" className={inputClass} />
        </Field>
        <Field label="Situação">
          <select value={draft.status} onChange={set("status")} className={inputClass}>
            <option value="pago">Já paguei</option>
            <option value="a_pagar">Falta pagar</option>
          </select>
        </Field>
        {draft.status === "a_pagar" ? (
          <Field label="Vence em">
            <input type="date" value={draft.dueDate} onChange={set("dueDate")} className={inputClass} />
          </Field>
        ) : (
          <Field label="Pago em" hint="Deixe vazio se foi no mesmo dia do gasto.">
            <input type="date" value={draft.paidAt} onChange={set("paidAt")} className={inputClass} />
          </Field>
        )}
        <Field label="Observações" className="sm:col-span-2">
          <textarea rows={2} value={draft.notes} onChange={set("notes")} className={`${inputClass} resize-none`} />
        </Field>
      </div>
      <ErrorNote message={error} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onSave(draft)} disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        {onRemove && (
          <Button variant="danger" onClick={onRemove} disabled={busy} className="ml-auto">
            Excluir
          </Button>
        )}
      </div>
    </div>
  );
}
