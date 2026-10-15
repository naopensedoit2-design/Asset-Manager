"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, CheckCheck, Clock, FileText, Pause, Play, Send } from "lucide-react";
import { AdminHeader, api, Button, ErrorNote, Loading, whatsappLink } from "@/components/gestor/ui";
import { formatDateBR } from "@/lib/gestor/rules";
import { type ConversationSummary } from "@/components/gestor/wa";

interface Message {
  id: number;
  direction: "in" | "out";
  author: string;
  type: string;
  kind: string;
  text: string;
  mediaId: string;
  mediaMime: string;
  fileName: string;
  status: string;
  error: string;
  createdAt: string;
}

interface Conversation {
  contact: ConversationSummary;
  messages: Message[];
}

const TZ = "America/Sao_Paulo";
const time = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));

function dayLabel(key: string) {
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  if (key === today) return "Hoje";
  if (key === yesterday) return "Ontem";
  return formatDateBR(key);
}

const AUTHOR: Record<string, string> = { margot: "Margot", leonardo: "Você", sistema: "Automático", cliente: "" };

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data, error, isLoading } = useQuery<Conversation>({
    queryKey: ["wa-conversa", id],
    queryFn: () => api(`/api/admin/whatsapp/conversas/${id}`),
    refetchInterval: 5_000,
  });
  const bottom = useRef<HTMLDivElement>(null);
  // Fica grudado no fim da conversa, a menos que o Leonardo tenha rolado para cima para ler.
  const stick = useRef(true);
  const lastId = data?.messages[data.messages.length - 1]?.id;
  const toBottom = () => {
    // Depois do próximo quadro: o Next.js também mexe na rolagem ao abrir a página.
    if (!stick.current) return;
    setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }), 60);
  };

  useEffect(() => {
    const onScroll = () => {
      stick.current = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight) < 240;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(toBottom, [lastId]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["wa-nao-lidas"] });
  }, [lastId, queryClient]);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <AdminHeader active="conversas" />
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <main className="max-w-3xl mx-auto w-full px-4 py-6">
          <ErrorNote message={(error as Error)?.message ?? "Conversa não encontrada."} />
        </main>
      ) : (
        <>
          <TopBar c={data.contact} onChange={(next) => queryClient.setQueryData(["wa-conversa", id], next)} />
          <main className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-6 py-4 space-y-2">
            {data.messages.length === 0 && <p className="text-sm text-text-muted text-center py-10">Nenhuma mensagem ainda.</p>}
            {data.messages.map((m, i) => {
              const prev = data.messages[i - 1];
              const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="flex justify-center my-3">
                      <span className="text-[11px] uppercase tracking-wider text-text-muted bg-bg-card border border-border-subtle rounded-full px-3 py-1">
                        {dayLabel(dayKey(m.createdAt))}
                      </span>
                    </div>
                  )}
                  <Bubble m={m} ownerChat={data.contact.isOwner} onMediaLoad={toBottom} />
                </div>
              );
            })}
            <div ref={bottom} />
          </main>
          <Composer c={data.contact} id={id} onSent={(next) => queryClient.setQueryData(["wa-conversa", id], next)} />
        </>
      )}
    </div>
  );
}

function TopBar({ c, onChange }: { c: ConversationSummary; onChange: (next: Conversation) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = c.isOwner ? "Você (modo secretária)" : c.clientName || c.name || c.phone;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      onChange(await api<Conversation>(`/api/admin/whatsapp/conversas/${c.id}`, { method: "PATCH", body: { pausar: !c.paused } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky top-14 z-30 bg-bg-secondary/95 backdrop-blur border-b border-border-subtle">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2.5 flex items-center gap-3">
        <Link href="/admin/conversas" aria-label="Voltar para conversas" className="p-1.5 -ml-1.5 text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-text-primary truncate">{title}</p>
          <p className="text-xs text-text-muted truncate">
            {c.phone}
            {c.order && (
              <>
                {" · "}
                <Link href={`/admin/pedidos/${c.order.id}`} className="text-gold hover:underline">
                  Pedido #{c.order.id} · {c.order.statusLabel}
                </Link>
              </>
            )}
          </p>
        </div>
        {!c.isOwner && (
          <Button variant={c.paused ? "gold" : "ghost"} onClick={toggle} disabled={busy} className="!px-3 !py-2 shrink-0">
            {c.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span className="hidden sm:inline">{c.paused ? "Margot volta a atender" : "Pausar Margot"}</span>
            <span className="sm:hidden">{c.paused ? "Retomar" : "Pausar"}</span>
          </Button>
        )}
      </div>
      {!c.isOwner && (
        <p className={`max-w-3xl mx-auto px-3 sm:px-6 pb-2 text-xs ${c.paused ? "text-amber-300" : "text-text-muted"}`}>
          {c.paused
            ? `Margot pausada${c.pausedUntil ? ` até ${new Date(c.pausedUntil).toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" })}` : ""}: você está atendendo. Mensagens novas chegam no seu WhatsApp.`
            : "Margot atendendo esta conversa."}
        </p>
      )}
      {error && <p className="max-w-3xl mx-auto px-3 sm:px-6 pb-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

function Ticks({ status }: { status: string }) {
  if (status === "lida") return <CheckCheck className="w-3.5 h-3.5 text-sky-300" aria-label="lida" />;
  if (status === "entregue") return <CheckCheck className="w-3.5 h-3.5" aria-label="entregue" />;
  if (status === "enviada") return <Check className="w-3.5 h-3.5" aria-label="enviada" />;
  if (status === "pendente") return <Clock className="w-3.5 h-3.5" aria-label="na fila" />;
  if (status === "falhou") return <AlertTriangle className="w-3.5 h-3.5 text-red-300" aria-label="falhou" />;
  return null;
}

function Media({ m, onLoad }: { m: Message; onLoad?: () => void }) {
  if (!m.mediaId) return null;
  const src = `/api/admin/whatsapp/midia/${encodeURIComponent(m.mediaId)}`;
  // Avisos com foto (ex.: comprovante com botões) chegam como "interactive": decide pelo tipo do arquivo.
  const kind = ["image", "sticker", "audio", "video", "document"].includes(m.type)
    ? m.type
    : m.mediaMime.startsWith("image/")
      ? "image"
      : m.mediaMime.startsWith("audio/")
        ? "audio"
        : "document";
  if (kind === "image" || kind === "sticker") {
    return (
      <a href={src} target="_blank" rel="noreferrer" className="block mb-1.5">
        <img
          src={src}
          alt={m.text || "Foto recebida"}
          onLoad={onLoad}
          className="rounded max-h-72 w-auto max-w-full object-contain bg-black/30"
        />
      </a>
    );
  }
  if (kind === "audio") return <audio controls preload="none" src={src} className="w-64 max-w-full mb-1.5" />;
  if (kind === "video") return <video controls preload="none" src={src} className="rounded max-h-72 max-w-full mb-1.5" />;
  return (
    <a href={src} target="_blank" rel="noreferrer" className="flex items-center gap-2 mb-1.5 bg-black/20 rounded px-3 py-2 text-sm hover:bg-black/30">
      <FileText className="w-4 h-4 shrink-0" />
      <span className="truncate">{m.fileName || "Documento"}</span>
    </a>
  );
}

/** Texto com a formatação do WhatsApp (*negrito*, _itálico_, ~riscado~) e links clicáveis. */
function WaText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^https?:\/\//.test(p)) {
          return (
            <a key={i} href={p} target="_blank" rel="noreferrer" className="underline underline-offset-2 text-gold-light break-all">
              {p}
            </a>
          );
        }
        if (p.length > 2 && p.startsWith("*") && p.endsWith("*")) return <strong key={i}>{p.slice(1, -1)}</strong>;
        if (p.length > 2 && p.startsWith("_") && p.endsWith("_")) return <em key={i}>{p.slice(1, -1)}</em>;
        if (p.length > 2 && p.startsWith("~") && p.endsWith("~")) return <s key={i}>{p.slice(1, -1)}</s>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function Bubble({ m, ownerChat, onMediaLoad }: { m: Message; ownerChat: boolean; onMediaLoad?: () => void }) {
  const mine = m.direction === "out";
  const label = mine ? AUTHOR[m.author] ?? m.author : ownerChat ? "Você" : "";
  const tone = !mine
    ? "bg-bg-elevated border-border-subtle text-text-primary"
    : m.author === "leonardo"
      ? "bg-gold/20 border-gold/40 text-text-primary"
      : "bg-gold-muted border-border-gold text-text-primary";
  const text =
    m.type === "template" ? `Aviso modelo: ${m.text}` : m.type === "audio" && m.text && !mine ? `🎤 “${m.text}”` : m.text;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] border rounded-lg px-3 py-2 ${tone} ${m.status === "falhou" ? "border-red-400/50" : ""}`}>
        {label && <p className="text-[11px] uppercase tracking-wider text-gold mb-0.5">{label}</p>}
        <Media m={m} onLoad={onMediaLoad} />
        {text && (
          <p className="text-sm whitespace-pre-wrap break-words">
            <WaText text={text} />
          </p>
        )}
        {m.type === "interactive" && mine && <p className="text-[11px] text-text-muted mt-1">com botões</p>}
        {m.status === "falhou" && m.error && <p className="text-xs text-red-300 mt-1">{m.error}</p>}
        {m.status === "pendente" && <p className="text-xs text-amber-300 mt-1">Na fila: sai quando a conversa abrir.</p>}
        <p className="flex items-center justify-end gap-1 text-[11px] text-text-muted mt-1">
          {time(m.createdAt)}
          {mine && <Ticks status={m.status} />}
        </p>
      </div>
    </div>
  );
}

function Composer({ c, id, onSent }: { c: ConversationSummary; id: string; onSent: (next: Conversation) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (c.isOwner) {
    return (
      <div className="sticky bottom-0 bg-bg-secondary border-t border-border-subtle">
        <p className="max-w-3xl mx-auto px-4 py-3 text-xs text-text-muted">
          Esta é a sua conversa com a Margot. Fale com ela pelo seu WhatsApp, mandando mensagem para o número dela.
        </p>
      </div>
    );
  }

  async function sendNow() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      onSent(await api<Conversation>(`/api/admin/whatsapp/conversas/${id}`, { body: { texto: text } }));
      setText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-0 bg-bg-secondary/95 backdrop-blur border-t border-border-subtle">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 space-y-2">
        {error && <ErrorNote message={error} />}
        {c.windowOpen ? (
          <>
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={Math.min(5, Math.max(1, text.split("\n").length))}
                placeholder="Escreva como Leonardo…"
                aria-label="Mensagem"
                className="flex-1 resize-none bg-bg-elevated border border-border-subtle text-text-primary placeholder-text-muted px-3 py-2.5 rounded text-base sm:text-sm focus:outline-none focus:border-gold/60"
              />
              <Button onClick={sendNow} disabled={busy || !text.trim()} aria-label="Enviar" className="!px-3.5 !py-3">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[11px] text-text-muted">Sai pelo número da Margot, assinado como você. A Margot pausa nesta conversa por 24h.</p>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-muted flex-1 min-w-48">
              A pessoa não escreve há mais de 24h. Pelas regras do WhatsApp, o número da Margot não pode puxar conversa; responda pelo seu.
            </p>
            <a href={whatsappLink(c.waId)} target="_blank" rel="noreferrer">
              <Button variant="ghost">Abrir no meu WhatsApp</Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
