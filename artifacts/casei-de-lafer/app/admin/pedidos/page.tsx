"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Plus, Search } from "lucide-react";
import { api, ErrorNote, StatusBadge } from "@/components/gestor/ui";
import { Chip, PageTitle, Skeleton } from "@/components/admin/ui";
import {
  eventWhen,
  filterCounts,
  filterOrders,
  latestQuoteCents,
  ORDER_FILTERS,
  paymentSummary,
  type OrderFilterKey,
  type OrderLite,
} from "@/lib/admin/pedidos";
import { formatBRL, formatDateBR, todayISO, type OrderStatus } from "@/lib/gestor/rules";

export default function OrdersPage() {
  const [filter, setFilter] = useState<OrderFilterKey>("andamento");
  const [query, setQuery] = useState("");
  const { data, error, isLoading } = useQuery<OrderLite[]>({
    queryKey: ["gestor-pedidos"],
    queryFn: () => api("/api/admin/gestor/pedidos"),
    staleTime: 30_000,
  });
  const today = todayISO();
  const counts = useMemo(() => filterCounts(data ?? [], query), [data, query]);
  const shown = useMemo(() => filterOrders(data ?? [], filter, query), [data, filter, query]);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      <PageTitle
        title="Pedidos"
        hint="Do primeiro contato ao casamento realizado."
        right={
          <Link
            href="/admin/pedidos/novo"
            className="shrink-0 inline-flex min-h-11 items-center gap-1.5 rounded bg-gold px-4 text-sm font-semibold text-bg-primary transition-colors hover:bg-gold-light"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Novo pedido
          </Link>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
        <input
          type="search"
          inputMode="search"
          aria-label="Buscar pedido por nome, telefone, local ou número"
          placeholder="Buscar por nome, telefone ou local"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full min-h-11 rounded border border-border-subtle bg-bg-card pl-10 pr-3 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/60"
        />
      </div>

      <div role="group" aria-label="Filtrar pedidos" className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {ORDER_FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 min-h-10 rounded-full border px-3.5 text-sm transition-colors cursor-pointer ${
                on ? "border-gold/60 bg-gold-muted text-gold" : "border-border-subtle text-text-secondary hover:text-text-primary"
              }`}
            >
              {f.label} <span className="tabular-nums">({counts[f.key]})</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Carregando os pedidos">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <ErrorNote message={(error as Error).message} />
        ) : shown.length === 0 ? (
          <Empty hasAny={(data?.length ?? 0) > 0} query={query} />
        ) : (
          <ul className="space-y-3">
            {shown.map((o) => (
              <OrderCard key={o.id} o={o} today={today} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function OrderCard({ o, today }: { o: OrderLite; today: string }) {
  const pay = paymentSummary(o, today);
  const quote = latestQuoteCents(o);
  const place = [o.venue, o.city].filter(Boolean).join(", ");
  const past = o.eventDate !== null && o.eventDate < today;

  return (
    <li>
      <Link href={`/admin/pedidos/${o.id}`} className="block rounded-lg border border-border-subtle bg-bg-card px-4 py-4 transition-colors hover:border-border-gold">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 font-serif text-xl leading-snug text-text-primary">{o.client.name}</p>
          <StatusBadge status={o.status as OrderStatus} />
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {o.eventDate ? (
            <>
              {formatDateBR(o.eventDate)}
              {o.eventTime ? ` às ${o.eventTime}` : ""} · <span className={past ? "" : "text-gold"}>{eventWhen(o.eventDate, today)}</span>
            </>
          ) : (
            "Sem data definida"
          )}
        </p>
        {place && <p className="text-sm text-text-secondary">{place}</p>}

        {(quote !== null || pay.totalCents > 0) && (
          <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-text-secondary">
            {quote !== null && <span>Orçamento {formatBRL(quote)}</span>}
            {pay.totalCents > 0 && (
              <span>
                Recebido {formatBRL(pay.receivedCents)} de {formatBRL(pay.totalCents)}
              </span>
            )}
            {pay.open?.overdue && <Chip tone="bad">Pagamento atrasado</Chip>}
            {pay.open && !pay.open.overdue && pay.open.dueDate && o.status !== "realizado" && (
              <Chip tone="warn">{pay.open.kind === "sinal" ? "Sinal" : "Saldo"} até {formatDateBR(pay.open.dueDate).slice(0, 5)}</Chip>
            )}
          </p>
        )}
      </Link>
    </li>
  );
}

function Empty({ hasAny, query }: { hasAny: boolean; query: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-card px-5 py-8 text-center">
      <ClipboardList className="mx-auto w-7 h-7 text-text-muted" aria-hidden="true" />
      <p className="mt-3 text-sm text-text-secondary">
        {!hasAny
          ? "Nenhum pedido ainda. Quando um cliente pedir orçamento pelo site ou pelo WhatsApp, ele aparece aqui."
          : query
            ? `Nenhum pedido combina com “${query}”.`
            : "Nenhum pedido neste filtro."}
      </p>
    </div>
  );
}
