"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bot, CalendarHeart, Car, ChevronRight, Clock, Info, MessageCircle, Plug, Receipt, RotateCw } from "lucide-react";
import { api, Button, ErrorNote, Panel, StatusBadge } from "@/components/gestor/ui";
import { useHoje } from "@/components/admin/hoje-query";
import { useMargotToggle } from "@/components/admin/MargotSheet";
import { useShell } from "@/components/admin/shell-context";
import Switch from "@/components/admin/Switch";
import { Chip, Section, Skeleton, TONE_BAR, TONE_TEXT, type Tone as UiTone } from "@/components/admin/ui";
import { whenLabel } from "@/lib/admin/conexoes";
import type { HojeData, QueueItem, QueueKind, Stop, Tone } from "@/lib/admin/hoje";
import { formatBRL, formatDateBR, type OrderStatus } from "@/lib/gestor/rules";

const TZ = "America/Sao_Paulo";
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** Quantas pendências aparecem antes de "Ver as outras". */
const QUEUE_VISIBLE = 4;

export default function HojePage() {
  const { data, error, isLoading, refetch, isFetching } = useHoje();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {isLoading ? (
        <HojeSkeleton />
      ) : error || !data ? (
        <div className="space-y-4 py-6">
          <ErrorNote message={(error as Error | null)?.message ?? "Não foi possível carregar o resumo de hoje."} />
          <Button variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Tentando…" : "Tentar de novo"}
          </Button>
        </div>
      ) : (
        <HojeView data={data} refreshing={isFetching} onRefresh={() => refetch()} />
      )}
    </main>
  );
}

function HojeView({ data, refreshing, onRefresh }: { data: HojeData; refreshing: boolean; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <Heading data={data} refreshing={refreshing} onRefresh={onRefresh} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8 items-start">
        <div className="space-y-8 min-w-0">
          <Queue data={data} />
          <Stops stops={data.paradas} />
        </div>
        <div className="space-y-6 min-w-0">
          <MargotCard m={data.margot} />
          <MoneyCard d={data.dinheiro} />
          <RoutineCard r={data.rotina} now={new Date(data.agora)} />
        </div>
      </div>
    </div>
  );
}

// ─── Cabeçalho ───────────────────────────────────────────────

function Heading({ data, refreshing, onRefresh }: { data: HojeData; refreshing: boolean; onRefresh: () => void }) {
  const day = new Date(`${data.hoje}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(day);
  const dateText = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" }).format(day);
  const now = new Date(data.agora);
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(now));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const updated = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(now);
  const total = data.fila.length;
  const urgent = data.fila.filter((q) => q.tone === "urgente").length;

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-text-secondary">
          {greeting} · {capitalize(weekday)}
        </p>
        <h1 className="font-serif text-[2rem] sm:text-4xl leading-tight text-text-primary">{dateText}</h1>
        <p className={`mt-1.5 text-[15px] ${total === 0 ? "text-ok" : "text-text-primary"}`}>
          {total === 0
            ? "Tudo em dia. A Margot cuida do resto."
            : `${total} ${total === 1 ? "coisa espera" : "coisas esperam"} por você${urgent ? ` · ${urgent} ${urgent === 1 ? "urgente" : "urgentes"}` : ""}`}
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label={`Atualizar. Última atualização às ${updated}`}
        className="shrink-0 mt-1 inline-flex flex-col items-center gap-0.5 min-w-11 px-1 py-1 rounded-md text-text-secondary hover:text-text-primary cursor-pointer disabled:cursor-wait"
      >
        <RotateCw className={`w-[18px] h-[18px] ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
        <span className="text-[11px] leading-none tabular-nums" aria-hidden="true">
          {updated}
        </span>
      </button>
    </header>
  );
}

// ─── Fila: o que precisa do Leonardo ─────────────────────────

const TONE_UI: Record<Tone, { tone: UiTone; label: string }> = {
  urgente: { tone: "bad", label: "Urgente" },
  atencao: { tone: "warn", label: "Atenção" },
  info: { tone: "info", label: "Aviso" },
};

const KIND_ICON: Record<QueueKind, typeof Bot> = {
  aprovacao: Bot,
  sistema: Plug,
  alerta: AlertTriangle,
  conversa: MessageCircle,
  conta: Receipt,
};

function Queue({ data }: { data: HojeData }) {
  const qc = useQueryClient();
  const [all, setAll] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const items = all ? data.fila : data.fila.slice(0, QUEUE_VISIBLE);
  const hidden = data.fila.length - items.length;

  return (
    <Section title="Precisa de você">
      {done && (
        <div role="status" className="mb-3 flex items-start gap-3 rounded-lg border border-ok/40 bg-ok/5 px-4 py-3 text-sm text-text-primary">
          <p className="flex-1 whitespace-pre-line">{done}</p>
          <button type="button" onClick={() => setDone(null)} className="text-text-secondary underline underline-offset-2 cursor-pointer shrink-0">
            Fechar
          </button>
        </div>
      )}

      {data.fila.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-card px-5 py-6">
          <p className="font-serif text-lg text-text-primary">Nada esperando por você.</p>
          <p className="mt-1 text-sm text-text-secondary">
            {data.margot.whatsappLigado
              ? `A Margot respondeu ${data.margot.respostas24h} ${data.margot.respostas24h === 1 ? "mensagem" : "mensagens"} nas últimas 24 horas. Se algo fugir do que ela resolve, aparece aqui.`
              : "A Margot está pausada no WhatsApp. Se algo chegar, aparece aqui."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <QueueCard
              key={item.id}
              item={item}
              onResolved={(msg) => {
                setDone(msg);
                qc.invalidateQueries();
              }}
            />
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-3 w-full min-h-11 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-text-primary hover:border-border-gold cursor-pointer"
        >
          Ver as outras {hidden}
        </button>
      )}
      {all && data.fila.length > QUEUE_VISIBLE && (
        <button type="button" onClick={() => setAll(false)} className="mt-3 w-full min-h-11 text-sm text-text-secondary hover:text-text-primary cursor-pointer">
          Mostrar menos
        </button>
      )}
    </Section>
  );
}

function QueueCard({ item, onResolved }: { item: QueueItem; onResolved: (message: string) => void }) {
  const ui = TONE_UI[item.tone];
  const Icon = item.tone === "info" && item.kind === "alerta" ? Info : KIND_ICON[item.kind];
  const approval = item.kind === "aprovacao" && item.approvalId !== undefined;
  const resolve = useMutation({
    mutationFn: (acao: "confirmar" | "cancelar") => api<{ mensagem: string }>(`/api/admin/gestor/aprovacoes/${item.approvalId}`, { body: { acao } }),
    onSuccess: (r) => onResolved(r.mensagem),
  });

  return (
    <li className="relative overflow-hidden rounded-lg border border-border-subtle bg-bg-card">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${TONE_BAR[ui.tone]}`} />
      <div className="py-4 pl-5 pr-4">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 w-5 h-5 shrink-0 ${TONE_TEXT[ui.tone]}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            {approval && <p className="mb-0.5 text-xs font-medium text-gold">A Margot pede o seu OK</p>}
            <p className="font-sans font-medium leading-snug text-text-primary">
              {item.tone === "urgente" && <span className="sr-only">Urgente: </span>}
              {item.title}
            </p>
            {item.detail && (
              <p className={`mt-1 text-sm leading-relaxed text-text-secondary ${approval ? "whitespace-pre-line" : "line-clamp-3"}`}>{item.detail}</p>
            )}
          </div>
          {item.tone === "urgente" && (
            <Chip tone="bad" className="shrink-0">
              {ui.label}
            </Chip>
          )}
        </div>

        <div className="mt-3 pl-8 flex flex-wrap items-center gap-2">
          {approval ? (
            <>
              <Button onClick={() => resolve.mutate("confirmar")} disabled={resolve.isPending} className="min-h-11">
                {resolve.isPending && resolve.variables === "confirmar" ? "Confirmando…" : "Confirmar"}
              </Button>
              <Button variant="ghost" onClick={() => resolve.mutate("cancelar")} disabled={resolve.isPending} className="min-h-11">
                {resolve.isPending && resolve.variables === "cancelar" ? "Cancelando…" : "Cancelar"}
              </Button>
            </>
          ) : (
            <Link
              href={item.href}
              className="inline-flex min-h-11 items-center gap-1.5 rounded border border-border-subtle bg-bg-elevated px-4 text-sm text-text-primary transition-colors hover:border-border-gold"
            >
              {item.actionLabel}
              <ChevronRight className="w-4 h-4 text-text-secondary" aria-hidden="true" />
            </Link>
          )}
        </div>
        {resolve.error && (
          <div className="mt-3 pl-8">
            <ErrorNote message={(resolve.error as Error).message} />
          </div>
        )}
      </div>
    </li>
  );
}

// ─── Próximas paradas ────────────────────────────────────────

function Stops({ stops }: { stops: Stop[] }) {
  return (
    <Section
      title="Próximas paradas"
      right={
        <Link href="/admin/pedidos" className="text-sm text-gold underline underline-offset-4">
          Todos os pedidos
        </Link>
      }
    >
      {stops.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-card px-5 py-6">
          <CalendarHeart className="w-6 h-6 text-text-muted" aria-hidden="true" />
          <p className="mt-2 text-sm text-text-secondary">Nenhum casamento marcado pela frente. Quando um pedido ganhar data, ele aparece aqui.</p>
        </div>
      ) : (
        <ol className="rounded-lg border border-border-subtle bg-bg-card px-4 py-5 sm:px-5">
          {stops.map((s, i) => {
            const last = i === stops.length - 1;
            const first = i === 0;
            return (
              <li key={s.orderId} className={`relative pl-11 ${last ? "" : "pb-6"}`}>
                {!last && <span aria-hidden="true" className="absolute left-[15px] top-8 bottom-0 border-l-2 border-dashed border-border-gold" />}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 grid place-items-center rounded-full border-2 ${
                    first ? "w-8 h-8 border-gold bg-gold text-bg-primary" : "w-8 h-8 border-border-gold bg-bg-card text-gold"
                  }`}
                >
                  {first ? <Car className="w-4 h-4" /> : <span className="w-2 h-2 rounded-full bg-gold" />}
                </span>
                <Link href={`/admin/pedidos/${s.orderId}`} className="group block -my-1 py-1">
                  <p className="text-sm font-medium text-gold">
                    {capitalize(s.when)} <span className="text-text-secondary font-normal">· {formatDateBR(s.eventDate).slice(0, 5)}</span>
                  </p>
                  <p className="font-serif text-xl leading-snug text-text-primary group-hover:underline underline-offset-4 decoration-border-gold">{s.client}</p>
                  {(s.eventTime || s.place) && (
                    <p className="mt-0.5 text-sm text-text-secondary">{[s.eventTime && `às ${s.eventTime}`, s.place].filter(Boolean).join(" · ")}</p>
                  )}
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={s.status as OrderStatus} />
                    {s.pendingPayment && <Chip tone="warn">Falta receber</Chip>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}

// ─── Margot ──────────────────────────────────────────────────

const usd = (n: number) => `US$ ${n.toFixed(2).replace(".", ",")}`;

function MargotCard({ m }: { m: HojeData["margot"] }) {
  const toggle = useMargotToggle();
  const { openMargot } = useShell();
  const pct = m.limiteUsd > 0 ? Math.min(100, (m.usoUsd / m.limiteUsd) * 100) : 100;
  const high = pct >= 90;

  return (
    <Panel title="Margot">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-text-primary">{m.whatsappLigado ? "Atendendo no WhatsApp" : "Pausada no WhatsApp"}</p>
          <p className="text-xs text-text-secondary">{m.whatsappLigado ? "Você só entra nas exceções." : "As mensagens chegam só para você."}</p>
        </div>
        <Switch
          checked={m.whatsappLigado}
          onChange={(v) => toggle.mutate({ margotWhatsapp: v })}
          label={`Margot no WhatsApp: ${m.whatsappLigado ? "ligada" : "pausada"}`}
          disabled={toggle.isPending}
        />
      </div>
      <ErrorNote message={toggle.error ? (toggle.error as Error).message : null} />

      {(!m.whatsappConfigurado || !m.iaPronta) && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {!m.whatsappConfigurado && (
            <li className="text-warn">
              O WhatsApp ainda não está conectado.{" "}
              <Link href="/admin/conexoes" className="underline underline-offset-2">
                Ver o que falta
              </Link>
            </li>
          )}
          {!m.iaPronta && (
            <li className="text-warn">
              A IA não está pronta: falta a chave ou o limite do mês foi atingido.{" "}
              <Link href="/admin/conexoes" className="underline underline-offset-2">
                Ver detalhes
              </Link>
            </li>
          )}
        </ul>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border-subtle pt-4">
        <div>
          <dd className="font-serif text-2xl tabular-nums text-text-primary">{m.respostas24h}</dd>
          <dt className="text-xs text-text-secondary">respostas nas últimas 24 h</dt>
        </div>
        <div>
          <dd className="font-serif text-2xl tabular-nums text-text-primary">{m.conversasEmAndamento}</dd>
          <dt className="text-xs text-text-secondary">conversas com movimento</dt>
        </div>
      </dl>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3 text-xs text-text-secondary">
          <span>Uso da IA neste mês</span>
          <span className="tabular-nums">
            {usd(m.usoUsd)} de {usd(m.limiteUsd)}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Uso da IA neste mês"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-elevated"
        >
          <div className={`h-full rounded-full ${high ? "bg-bad" : "bg-gold"}`} style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
      </div>

      <button type="button" onClick={openMargot} className="mt-4 text-sm text-gold underline underline-offset-4 cursor-pointer">
        Mais ajustes da Margot
      </button>
    </Panel>
  );
}

// ─── Dinheiro ────────────────────────────────────────────────

function MoneyCard({ d }: { d: HojeData["dinheiro"] }) {
  const tiles: { label: string; value: number; tone?: UiTone; note?: string }[] = [
    { label: "Recebido no mês", value: d.recebidoMesCents, tone: "ok" },
    { label: "A receber", value: d.aReceberCents, note: d.atrasadoCents > 0 ? `${formatBRL(d.atrasadoCents)} atrasado` : undefined },
    { label: "A pagar", value: d.aPagarCents, note: d.aPagarVencidoCents > 0 ? `${formatBRL(d.aPagarVencidoCents)} vencido` : undefined },
  ];
  return (
    <Panel title="Dinheiro">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        {tiles.map((t, i) => (
          <div key={t.label} className={i === 0 ? "col-span-2" : ""}>
            <dt className="text-xs text-text-secondary">{t.label}</dt>
            <dd className={`font-serif tabular-nums ${i === 0 ? "text-3xl" : "text-xl"} ${t.tone ? TONE_TEXT[t.tone] : "text-text-primary"}`}>{formatBRL(t.value)}</dd>
            {t.note && <p className="text-xs text-bad mt-0.5">{t.note}</p>}
          </div>
        ))}
      </dl>
      <Link href="/admin/financeiro" className="mt-4 inline-block text-sm text-gold underline underline-offset-4">
        Abrir Dinheiro
      </Link>
    </Panel>
  );
}

// ─── Rotina das 7h ───────────────────────────────────────────

function RoutineCard({ r, now }: { r: HojeData["rotina"]; now: Date }) {
  return (
    <Link href="/admin/conexoes" className="group flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-card px-4 py-3.5 transition-colors hover:border-border-gold">
      <Clock className="mt-0.5 w-5 h-5 shrink-0 text-text-secondary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-text-primary">Rotina das 7h</span>
        <span className="block text-xs text-text-secondary">
          {r.ultimaExecucao
            ? `Rodou ${whenLabel(r.ultimaExecucao, now)}${r.resumoEnviado ? " e mandou o resumo do dia." : r.detalhe ? `. ${r.detalhe}.` : "."}`
            : "Sem registro ainda. Aparece depois da próxima rodada."}
        </span>
      </span>
      <ChevronRight className="mt-0.5 w-4 h-4 shrink-0 text-text-muted group-hover:text-text-primary" aria-hidden="true" />
    </Link>
  );
}

// ─── Carregando ──────────────────────────────────────────────

function HojeSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando o resumo de hoje">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
