"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, PauseCircle } from "lucide-react";
import { api, ErrorNote, Loading, Panel } from "@/components/gestor/ui";
import { formatDateBR } from "@/lib/gestor/rules";
import { whenLabel, type ConversationSummary, type Status } from "@/components/gestor/wa";

const MEDIA_LABEL: Record<string, string> = {
  image: "📷 Foto",
  audio: "🎤 Áudio",
  document: "📄 Documento",
  video: "🎬 Vídeo",
  sticker: "Figurinha",
  location: "📍 Localização",
  template: "Aviso modelo",
};

function preview(c: ConversationSummary): string {
  const l = c.last;
  if (!l) return "Sem mensagens";
  const who = l.direction === "in" ? "" : l.author === "leonardo" ? "Você: " : l.author === "margot" ? "Margot: " : "Automático: ";
  const body = l.text || MEDIA_LABEL[l.type] || "Mensagem";
  const media = l.text && MEDIA_LABEL[l.type] && l.type !== "template" ? `${MEDIA_LABEL[l.type]} · ` : "";
  return `${who}${media}${body}`;
}

function initials(name: string) {
  const parts = name.replace(/[^\p{L}\s&]/gu, "").split(/\s|&/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

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

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist">
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
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                filter === key ? "border-gold/60 bg-gold-muted text-gold" : "border-border-subtle text-text-secondary hover:text-text-primary"
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
          <ul className="bg-bg-card border border-border-subtle rounded-lg divide-y divide-border-subtle overflow-hidden">
            {shown.map((c) => (
              <ConversationRow key={c.id} c={c} />
            ))}
          </ul>
        )}

        {owner && (
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted mb-2">Sua conversa com a Margot</p>
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
  return (
    <li>
      <Link href={`/admin/conversas/${c.id}`} className="flex gap-3 px-4 py-3.5 hover:bg-bg-elevated transition-colors">
        <span
          aria-hidden
          className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center font-serif text-lg ${
            c.isOwner ? "bg-gold text-bg-primary" : "bg-bg-elevated text-gold border border-border-gold"
          }`}
        >
          {initials(title)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={`truncate ${c.unread > 0 ? "text-text-primary font-semibold" : "text-text-primary"}`}>{title}</span>
            <span className={`ml-auto shrink-0 text-xs ${c.unread > 0 ? "text-gold" : "text-text-muted"}`}>{whenLabel(c.lastMessageAt)}</span>
          </span>
          <span className="flex items-center gap-2 mt-0.5">
            <span className={`truncate text-sm ${c.unread > 0 ? "text-text-secondary" : "text-text-muted"}`}>{preview(c)}</span>
            {c.unread > 0 && (
              <span className="ml-auto shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-gold text-bg-primary text-[11px] font-semibold flex items-center justify-center">
                {c.unread}
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
                  <PauseCircle className="w-3 h-3" /> Margot pausada
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
