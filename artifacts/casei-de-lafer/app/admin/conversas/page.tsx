"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, PauseCircle, User } from "lucide-react";
import { api, ErrorNote, Loading, Panel } from "@/components/gestor/ui";
import { formatDateBR } from "@/lib/gestor/rules";
import { whenLabel, type ConversationSummary, type Status } from "@/components/gestor/wa";
import { Ticks } from "@/components/gestor/wa-message";
import { initials, previewBody, previewWho } from "@/lib/wa/view";

type Filter = "todas" | "esperando" | "pausadas";

export default function ConversationsPage() {
  const [filter, setFilter] = useState<Filter>("todas");
  const { data, error, isLoading } = useQuery<ConversationSummary[]>({
    queryKey: ["wa-conversas"],
    queryFn: () => api("/api/admin/whatsapp/conversas"),
    refetchInterval: 10_000,
  });
  const { data: status } = useQuery<Status>({
    queryKey: ["wa-status-curto"],
    queryFn: () => api("/api/admin/whatsapp/status"),
    staleTime: 5 * 60_000,
  });

  const clients = (data ?? []).filter((c) => !c.isOwner);
  const owner = (data ?? []).find((c) => c.isOwner);
  const shown = clients.filter((c) => (filter === "esperando" ? c.waiting : filter === "pausadas" ? c.paused : true));
  const counts = { esperando: clients.filter((c) => c.waiting).length, pausadas: clients.filter((c) => c.paused).length };

  return (
    <div>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <div>
          <h1 className="font-serif text-3xl text-text-primary">Conversas</h1>
          <p className="text-sm text-text-muted mt-1">WhatsApp da Margot. Toque numa conversa para ler e responder.</p>
        </div>

        {status && !status.configurado && (
          <Panel>
            <p className="text-sm text-text-secondary">
              O WhatsApp da Margot ainda não está conectado. Faltam na Vercel: {status.faltando.join(", ")}.
            </p>
            <p className="text-sm text-text-muted mt-2">
              O passo a passo está em{" "}
              <Link href="/admin/regras" className="text-gold underline underline-offset-2">
                Regras → WhatsApp da Margot
              </Link>
              .
            </p>
          </Panel>
        )}

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 lg:flex-wrap lg:overflow-visible" role="tablist">
          {(
            [
              ["todas", `Todas (${clients.length})`],
              ["esperando", `Esperando resposta (${counts.esperando})`],
              ["pausadas", `Margot pausada (${counts.pausadas})`],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                filter === key
                  ? "border-transparent bg-wa-out text-wa-text font-medium"
                  : "border-border-subtle text-text-secondary hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Loading />
        ) : error ? (
          <ErrorNote message={(error as Error).message} />
        ) : shown.length === 0 ? (
          <Panel>
            <div className="text-center py-6">
              <MessageCircle className="w-8 h-8 text-text-muted mx-auto" />
              <p className="text-sm text-text-secondary mt-3">
                {clients.length === 0 ? "Nenhuma conversa ainda. Quando alguém escrever para o número da Margot, aparece aqui." : "Nada neste filtro."}
              </p>
            </div>
          </Panel>
        ) : (
          <ul className="bg-bg-card border border-border-subtle rounded-lg overflow-hidden">
            {shown.map((c) => (
              <ConversationRow key={c.id} c={c} />
            ))}
          </ul>
        )}

        {owner && (
          <div>
            <p className="text-sm text-text-muted mb-2">Sua conversa com a Margot</p>
            <ul className="bg-bg-card border border-border-subtle rounded-lg overflow-hidden">
              <ConversationRow c={{ ...owner, name: "Você (modo secretária)", clientName: null }} />
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

function ConversationRow({ c }: { c: ConversationSummary }) {
  const title = c.clientName || c.name || c.phone;
  const letters = initials(title);
  const l = c.last;
  const unread = c.unread > 0;
  return (
    <li className="group">
      <Link href={`/admin/conversas/${c.id}`} className="flex items-center gap-3 pl-4 hover:bg-bg-elevated transition-colors">
        <span
          aria-hidden="true"
          className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-lg font-medium ${
            c.isOwner ? "bg-gold text-bg-primary" : "bg-bg-elevated text-text-secondary border border-border-subtle"
          }`}
        >
          {letters || <User className="w-6 h-6" />}
        </span>
        {/* O traço entre as conversas começa depois da foto, como no WhatsApp. */}
        <span className="min-w-0 flex-1 py-3 pr-4 border-b border-border-subtle group-last:border-b-0">
          <span className="flex items-baseline gap-2">
            <span className={`truncate text-[17px] ${unread ? "text-text-primary font-semibold" : "text-text-primary"}`}>{title}</span>
            <span className={`ml-auto shrink-0 text-xs ${unread ? "text-wa-accent font-medium" : "text-text-muted"}`}>{whenLabel(c.lastMessageAt)}</span>
          </span>
          <span className="flex items-center gap-1.5 mt-0.5">
            {l && l.direction === "out" && (
              <span className="shrink-0 text-text-muted">
                <Ticks status={l.status} />
              </span>
            )}
            <span className={`truncate text-sm ${unread ? "text-text-primary" : "text-text-muted"}`}>
              {l ? `${previewWho(l)}${previewBody(l)}` : "Sem mensagens"}
            </span>
            {unread && (
              <span className="ml-auto shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-wa-badge text-wa-badge-text text-[11px] font-semibold flex items-center justify-center">
                <span aria-hidden="true">{c.unread > 99 ? "99+" : c.unread}</span>
                <span className="sr-only">{c.unread === 1 ? "1 mensagem não lida" : `${c.unread} mensagens não lidas`}</span>
              </span>
            )}
          </span>
          {(c.order || c.paused || c.waiting) && !c.isOwner && (
            <span className="flex flex-wrap gap-1.5 mt-1.5">
              {c.order && (
                <span className="text-[11px] border border-border-gold text-gold-light rounded-full px-2 py-0.5">
                  #{c.order.id} · {c.order.statusLabel}
                  {c.order.eventDate ? ` · ${formatDateBR(c.order.eventDate)}` : ""}
                </span>
              )}
              {c.paused && (
                <span className="text-[11px] border border-warn/40 text-warn rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                  <PauseCircle className="w-3 h-3" aria-hidden="true" /> Margot pausada
                </span>
              )}
              {c.waiting && !c.paused && (
                <span className="text-[11px] border border-info/40 text-info rounded-full px-2 py-0.5">Esperando resposta</span>
              )}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
