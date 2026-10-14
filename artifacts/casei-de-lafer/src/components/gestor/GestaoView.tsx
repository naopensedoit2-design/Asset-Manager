"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  diffDays,
  formatBRL,
  formatDateBR,
  FUNNEL_COLUMNS,
  STATUS_LABELS,
  type Alert,
  type Kpis,
  type OrderStatus,
} from "@/lib/gestor/rules";
import type { OrderView } from "@/lib/gestor/service";
import { api, Button, ErrorNote, Loading, Panel, StatusBadge } from "./ui";

interface Dashboard {
  hoje: string;
  kpis: Kpis;
  alerts: Alert[];
  upcoming: OrderView[];
  funnel: OrderView[];
}

export default function GestaoView() {
  const { data, error, isLoading } = useQuery<Dashboard>({
    queryKey: ["gestor-resumo"],
    queryFn: () => api("/api/admin/gestor/resumo"),
    refetchInterval: 60_000,
  });

  if (isLoading) return <Loading />;
  if (error || !data) {
    return (
      <Panel>
        <ErrorNote message={(error as Error)?.message ?? "Não foi possível carregar o painel."} />
        <p className="text-sm text-text-muted mt-3">
          Se for o primeiro acesso depois da atualização, o banco pode ainda não ter as tabelas novas. Elas são criadas
          automaticamente no próximo deploy.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-4xl text-text-primary">Como está o negócio</h1>
          <p className="text-sm text-text-muted mt-1">{formatDateBR(data.hoje)}</p>
        </div>
        <Link href="/admin/pedidos/novo" className="shrink-0">
          <Button className="whitespace-nowrap">
            <Plus className="w-4 h-4" /> Novo pedido
          </Button>
        </Link>
      </div>

      <KpiGrid kpis={data.kpis} />

      <div className="grid gap-6 lg:grid-cols-5">
        <AlertList alerts={data.alerts} className="lg:col-span-3" />
        <Upcoming orders={data.upcoming} today={data.hoje} className="lg:col-span-2" />
      </div>

      <Funnel orders={data.funnel} />
      <MonthCalendar today={data.hoje} />
    </div>
  );
}

// ─── Indicadores ─────────────────────────────────────────────

function KpiGrid({ kpis }: { kpis: Kpis }) {
  const money = [
    { label: "Recebido no mês", value: kpis.recebidoMesCents },
    { label: "A receber", value: kpis.aReceberCents },
    ...(kpis.atrasadoCents > 0 ? [{ label: "Em atraso", value: kpis.atrasadoCents, alert: true }] : []),
  ];
  const counts = [
    { label: "Pedidos no mês", value: kpis.pedidosMes },
    { label: "Orçamentos no mês", value: kpis.orcamentosMes },
    { label: "Aguardando resposta", value: kpis.aguardando },
    { label: "Fechados", value: kpis.fechados },
    { label: "Conversão", value: kpis.conversao === null ? "—" : `${kpis.conversao}%` },
  ];
  return (
    <div className="space-y-3">
      <div className={`grid gap-3 ${money.length === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
        {money.map((m) => (
          <div
            key={m.label}
            className={`rounded-lg border p-3 sm:p-4 ${"alert" in m ? "border-destructive/50 bg-destructive/10 col-span-2 sm:col-span-1" : "border-border-gold bg-gold-muted/40"}`}
          >
            <p className="text-xs sm:text-sm text-text-secondary">{m.label}</p>
            <p className={`font-serif text-xl sm:text-3xl mt-1 ${"alert" in m ? "text-red-300" : "text-gold"}`}>{formatBRL(m.value)}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        {counts.map((c) => (
          <div key={c.label} className="rounded-lg border border-border-subtle bg-bg-card p-3">
            <p className="font-serif text-xl sm:text-2xl text-text-primary">{c.value}</p>
            <p className="text-[11px] sm:text-xs text-text-muted leading-snug">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alertas ─────────────────────────────────────────────────

const SEVERITY_STYLE = {
  urgente: "border-l-red-400",
  atencao: "border-l-amber-400",
  info: "border-l-gold/60",
} as const;

function AlertList({ alerts, className }: { alerts: Alert[]; className?: string }) {
  return (
    <Panel title="Precisa da sua atenção" className={className}>
      {alerts.length === 0 ? (
        <p className="text-sm text-text-muted">Nada pendente agora. Tudo em dia.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a, i) => {
            const body = (
              <>
                <p className="text-sm text-text-primary">{a.title}</p>
                <p className="text-xs text-text-muted">{a.detail}</p>
              </>
            );
            return (
              <li key={i} className={`border-l-2 ${SEVERITY_STYLE[a.severity]} bg-bg-elevated rounded-r px-3 py-2`}>
                {a.orderId ? (
                  <Link href={`/admin/pedidos/${a.orderId}`} className="block hover:opacity-80">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ─── Próximos eventos ────────────────────────────────────────

function Upcoming({ orders, today, className }: { orders: OrderView[]; today: string; className?: string }) {
  return (
    <Panel title="Próximos casamentos" className={className}>
      {orders.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhuma data reservada à frente.</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {orders.map((o) => {
            const days = diffDays(today, o.eventDate!);
            const balance = o.payments.find((p) => p.kind === "saldo" && p.status !== "cancelado");
            return (
              <li key={o.id}>
                <Link href={`/admin/pedidos/${o.id}`} className="flex gap-3 py-3 hover:opacity-80">
                  <div className={`w-14 shrink-0 text-center rounded border py-1 ${days <= 14 ? "border-gold/60" : "border-border-subtle"}`}>
                    <p className="font-serif text-xl leading-none text-text-primary">{o.eventDate!.slice(8, 10)}</p>
                    <p className="text-[11px] text-text-muted">{formatDateBR(o.eventDate!).slice(3)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary truncate">{o.client.name}</p>
                    <p className="text-xs text-text-muted truncate">
                      {[o.eventTime, o.venue, o.city].filter(Boolean).join(" · ") || "Local a definir"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <StatusBadge status={o.status} />
                      {balance && (
                        <span className={`text-xs ${balance.status === "recebido" ? "text-emerald-300" : "text-amber-300"}`}>
                          Saldo {balance.status === "recebido" ? "pago" : "pendente"}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted whitespace-nowrap">{days === 0 ? "hoje" : `${days}d`}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ─── Funil ───────────────────────────────────────────────────

function Funnel({ orders }: { orders: OrderView[] }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<number | null>(null);

  async function move(order: OrderView, to: OrderStatus) {
    setError(null);
    setMoving(order.id);
    try {
      await api(`/api/admin/gestor/pedidos/${order.id}/status`, { body: { status: to } });
      await queryClient.invalidateQueries({ queryKey: ["gestor-resumo"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMoving(null);
    }
  }

  return (
    <Panel title="Funil de vendas">
      <ErrorNote message={error} />
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 mt-2">
        {FUNNEL_COLUMNS.map((status) => {
          const items = orders.filter((o) => o.status === status);
          return (
            <div key={status} className="snap-start shrink-0 w-[78vw] sm:w-auto sm:flex-1 sm:min-w-[12.5rem] bg-bg-secondary rounded-lg p-3">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-sans text-sm font-medium text-text-primary">{STATUS_LABELS[status]}</h3>
                <span className="text-xs text-text-muted">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 && <p className="text-xs text-text-muted py-4 text-center">Vazio</p>}
                {items.map((o) => {
                  const total = o.quotes[0]?.totalCents;
                  return (
                    <div key={o.id} className="bg-bg-card border border-border-subtle rounded p-3">
                      <Link href={`/admin/pedidos/${o.id}`} className="block hover:opacity-80">
                        <p className="text-sm text-text-primary truncate">{o.client.name}</p>
                        <p className="text-xs text-text-muted">
                          {o.eventDate ? formatDateBR(o.eventDate) : "Sem data"}
                          {total ? ` · ${formatBRL(total)}` : ""}
                        </p>
                      </Link>
                      {o.proximosStatus.length > 0 && (
                        <select
                          aria-label={`Mover ${o.client.name}`}
                          disabled={moving === o.id}
                          value=""
                          onChange={(e) => e.target.value && move(o, e.target.value as OrderStatus)}
                          className="mt-2 w-full bg-bg-elevated border border-border-subtle text-xs text-text-secondary rounded px-2 py-1.5"
                        >
                          <option value="">{moving === o.id ? "Movendo…" : "Mover para…"}</option>
                          {o.proximosStatus.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─── Calendário do mês ───────────────────────────────────────

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function MonthCalendar({ today }: { today: string }) {
  const [cursor, setCursor] = useState({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) });
  const { data } = useQuery<{ dias: { data: string; status: string; orderId: number | null }[] }>({
    queryKey: ["gestor-calendario", cursor.y, cursor.m],
    queryFn: () => api(`/api/admin/gestor/calendario?ano=${cursor.y}&mes=${cursor.m}`),
  });

  const shift = (delta: number) =>
    setCursor(({ y, m }) => {
      const t = y * 12 + (m - 1) + delta;
      return { y: Math.floor(t / 12), m: (t % 12) + 1 };
    });

  const days = data?.dias ?? [];
  const lead = days.length ? new Date(`${days[0].data}T12:00:00Z`).getUTCDay() : 0;

  return (
    <Panel
      title="Agenda"
      action={
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} aria-label="Mês anterior" className="p-1.5 text-gold hover:bg-gold-muted rounded cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-text-primary w-32 text-center">
            {MONTHS[cursor.m - 1]} {cursor.y}
          </span>
          <button onClick={() => shift(1)} aria-label="Próximo mês" className="p-1.5 text-gold hover:bg-gold-muted rounded cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center max-w-md">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-xs text-text-muted py-1">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {days.map((d) => {
          const confirmed = d.status === "ocupada" && d.orderId;
          const blocked = d.status === "ocupada" && !d.orderId;
          const cls = confirmed
            ? "bg-gold text-bg-primary font-semibold"
            : d.status === "provisoria"
              ? "border border-gold text-gold"
              : blocked
                ? "bg-white/10 text-text-secondary"
                : d.data < today
                  ? "text-text-muted/50"
                  : "text-text-primary";
          const inner = (
            <span className={`flex items-center justify-center aspect-square rounded text-sm ${cls} ${d.data === today ? "ring-1 ring-text-secondary" : ""}`}>
              {Number(d.data.slice(8))}
            </span>
          );
          return d.orderId ? (
            <Link key={d.data} href={`/admin/pedidos/${d.orderId}`} aria-label={`${formatDateBR(d.data)}: ver pedido`}>
              {inner}
            </Link>
          ) : (
            <span key={d.data}>{inner}</span>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-gold" /> Confirmado</span>
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm border border-gold" /> Reserva sem sinal</span>
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-white/10" /> Bloqueio manual</span>
      </div>
    </Panel>
  );
}
