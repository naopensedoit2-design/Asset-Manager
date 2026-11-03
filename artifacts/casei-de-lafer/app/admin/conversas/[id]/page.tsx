"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Bell, BellOff, ChevronRight, EllipsisVertical, Pause, Play, Send, ShieldCheck, User } from "lucide-react";
import { api, ErrorNote, Loading, whatsappLink } from "@/components/gestor/ui";
import { formatDateBR } from "@/lib/gestor/rules";
import { type ConversationSummary } from "@/components/gestor/wa";
import { Bubble, NoticePill, type ChatMessage } from "@/components/gestor/wa-message";
import { ignoreExplanation } from "@/lib/wa/triage";
import { chatFlow, dayKeyBR, initials, TZ } from "@/lib/wa/view";

interface Conversation {
  contact: ConversationSummary;
  messages: ChatMessage[];
}

function dayLabel(key: string) {
  const today = dayKeyBR(new Date().toISOString());
  const yesterday = dayKeyBR(new Date(Date.now() - 86_400_000).toISOString());
  if (key === today) return "Hoje";
  if (key === yesterday) return "Ontem";
  return formatDateBR(key);
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data, error, isLoading } = useQuery<Conversation>({
    queryKey: ["wa-conversa", id],
    queryFn: () => api(`/api/admin/whatsapp/conversas/${id}`),
    refetchInterval: 5_000,
  });
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

  const [toggleError, setToggleError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Pausar/retomar a Margot, ignorar, reativar, bloquear e desbloquear: tudo é um PATCH que devolve a conversa atualizada. */
  async function act(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setToggleError(null);
    try {
      queryClient.setQueryData(["wa-conversa", id], await api<Conversation>(`/api/admin/whatsapp/conversas/${id}`, { method: "PATCH", body }));
      // As listas e o contador do menu mudam quando uma conversa entra ou sai de "ignoradas".
      for (const key of ["wa-conversas", "wa-conversas-ignoradas", "wa-nao-lidas"]) queryClient.invalidateQueries({ queryKey: [key] });
      return true;
    } catch (e) {
      setToggleError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh/var(--admin-zoom))]">
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <main className="max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
          <Link href="/admin/conversas" className="inline-flex items-center gap-2 text-sm text-gold">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Voltar para conversas
          </Link>
          <ErrorNote message={(error as Error)?.message ?? "Conversa não encontrada."} />
        </main>
      ) : (
        <>
          <TopBar c={data.contact} busy={busy} act={act} />
          <main className="wa-wall flex-1">
            <div className="max-w-3xl mx-auto w-full px-3 sm:px-6 pt-3 pb-4">
              {toggleError && <ErrorNote message={toggleError} />}
              <IgnoredNotice c={data.contact} busy={busy} act={act} />
              {data.contact.paused && !data.contact.isOwner && !data.contact.ignored && (
                <NoticePill>
                  Margot pausada
                  {data.contact.pausedUntil
                    ? ` até ${new Date(data.contact.pausedUntil).toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" })}`
                    : ""}
                  : você está atendendo. Mensagens novas chegam no seu WhatsApp.
                </NoticePill>
              )}
              {data.messages.length === 0 && <NoticePill>Nenhuma mensagem ainda.</NoticePill>}
              {chatFlow(data.messages).map(({ m, newDay, first }) => (
                <div key={m.id}>
                  {newDay && (
                    <div className="flex justify-center my-3">
                      <span className="rounded-lg bg-wa-pill px-3 py-1 text-[12.5px] uppercase tracking-wide text-wa-pill-text shadow-[0_1px_0.5px_var(--wa-shadow)]">
                        {dayLabel(dayKeyBR(m.createdAt))}
                      </span>
                    </div>
                  )}
                  <Bubble
                    m={m}
                    first={first}
                    ownerChat={data.contact.isOwner}
                    who={data.contact.clientName || data.contact.name}
                    onMediaLoad={toBottom}
                  />
                </div>
              ))}
            </div>
          </main>
          <Composer c={data.contact} id={id} acting={busy} act={act} onSent={(next) => queryClient.setQueryData(["wa-conversa", id], next)} />
        </>
      )}
    </div>
  );
}

function Avatar({ name, owner }: { name: string; owner: boolean }) {
  const letters = initials(name);
  return (
    <span
      aria-hidden="true"
      className={`w-10 h-10 shrink-0 rounded-full grid place-items-center font-medium ${owner ? "bg-gold text-bg-primary" : "bg-wa-bar-text/20 text-wa-bar-text"}`}
    >
      {letters || <User className="w-5 h-5" />}
    </span>
  );
}

type Act = (body: Record<string, unknown>) => Promise<boolean>;

/** Faixa dentro da conversa ignorada ou bloqueada, com o botão que desfaz. */
function IgnoredNotice({ c, busy, act }: { c: ConversationSummary; busy: boolean; act: Act }) {
  if (c.isOwner || (!c.ignored && !c.blocked)) return null;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <NoticePill>
        {c.blocked
          ? "Bloqueada no WhatsApp: esta pessoa não consegue mais escrever para o número da Margot."
          : ignoreExplanation(c.ignoredReason)}
      </NoticePill>
      <button
        type="button"
        disabled={busy}
        onClick={() => act({ acao: c.blocked ? "desbloquear" : "reativar" })}
        className="h-9 px-4 rounded-full inline-flex items-center gap-1.5 bg-wa-send text-wa-send-text text-sm font-medium cursor-pointer disabled:opacity-60"
      >
        {c.blocked ? <ShieldCheck className="w-4 h-4" aria-hidden="true" /> : <Bell className="w-4 h-4" aria-hidden="true" />}
        {c.blocked ? "Desbloquear" : "Reativar conversa"}
      </button>
    </div>
  );
}

/** Uma ação do menu "Mais opções": ícone, nome e uma linha dizendo o que acontece. */
function MenuItem({
  icon: Icon,
  title,
  hint,
  onClick,
  disabled,
}: {
  icon: typeof Ban;
  title: string;
  hint: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const body = (
    <>
      <Icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-[15px] font-medium">{title}</span>
        <span className="block text-xs text-wa-bar-muted">{hint}</span>
      </span>
    </>
  );
  const shared = "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left";
  // Sem ação possível, vira texto: um botão apagado com opacidade deixaria a explicação sem contraste.
  if (disabled) return <div className={`${shared} text-wa-bar-muted`}>{body}</div>;
  return (
    <button type="button" onClick={onClick} className={`${shared} hover:bg-wa-bar-text/10 cursor-pointer`}>
      {body}
    </button>
  );
}

/**
 * Confirmação do bloqueio, dentro da própria página (o navegador do app não mostra o confirm() nativo).
 * Só um contorno, sem fundo: um fundo mais claro sobre a barra tira o contraste do texto no tema Pérola.
 * O foco começa em "Cancelar", o lado seguro de uma ação que a pessoa do outro lado vai sentir.
 */
function ConfirmBlock({ title, busy, onConfirm, onCancel }: { title: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div role="group" aria-label="Confirmar bloqueio" className="rounded-lg border border-wa-bar-text/40 px-3 py-3 space-y-2.5 my-1">
      <p className="text-[15px] font-medium">Bloquear {title} no WhatsApp?</p>
      <p className="text-xs text-wa-bar-muted">A pessoa não vai mais conseguir escrever para o número da Margot. Dá para desbloquear depois.</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="h-9 px-4 rounded-full bg-wa-bar-text text-wa-bar text-sm font-medium cursor-pointer disabled:opacity-60"
        >
          Bloquear
        </button>
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={onCancel}
          className="h-9 px-4 rounded-full border border-wa-bar-text/50 text-sm font-medium cursor-pointer hover:bg-wa-bar-text/10 disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function TopBar({ c, busy, act }: { c: ConversationSummary; busy: boolean; act: Act }) {
  const [menu, setMenu] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const title = c.isOwner ? "Você (modo secretária)" : c.clientName || c.name || c.phone;

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const toggle = () => act({ pausar: !c.paused });
  async function run(acao: string) {
    if (await act({ acao })) {
      setMenu(false);
      setConfirmBlock(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-wa-bar text-wa-bar-text pt-[env(safe-area-inset-top)] shadow-[0_1px_2px_var(--wa-shadow)]">
      <div className="@container max-w-3xl mx-auto px-1.5 sm:px-4 h-14 flex items-center gap-2">
        <Link
          href="/admin/conversas"
          aria-label="Voltar para conversas"
          className="w-10 h-10 shrink-0 grid place-items-center rounded-full hover:bg-wa-bar-text/10"
        >
          <ArrowLeft className="w-6 h-6" aria-hidden="true" />
        </Link>
        <Avatar name={title} owner={c.isOwner} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[17px] font-medium">{title}</p>
          <p className="truncate text-xs text-wa-bar-muted">{c.phone}</p>
        </div>
        {!c.isOwner && !c.ignored && (
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-label={c.paused ? "Margot volta a atender" : "Pausar Margot"}
            className={`shrink-0 h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer disabled:opacity-60 ${
              c.paused ? "bg-wa-bar-text text-wa-bar" : "border border-wa-bar-text/50 hover:bg-wa-bar-text/10"
            }`}
          >
            {c.paused ? <Play className="w-4 h-4" aria-hidden="true" /> : <Pause className="w-4 h-4" aria-hidden="true" />}
            {/* Cabe menos palavra conforme a largura: no texto "Maior" do painel sobra só o ícone, e o nome ganha espaço. */}
            <span className="hidden @min-md:inline">{c.paused ? "Margot volta a atender" : "Pausar Margot"}</span>
            <span className="hidden @min-xs:inline @min-md:hidden">{c.paused ? "Retomar" : "Pausar"}</span>
          </button>
        )}
        {!c.isOwner && (
          <button
            type="button"
            onClick={() => {
              setMenu((open) => !open);
              setConfirmBlock(false);
            }}
            aria-label="Mais opções da conversa"
            aria-expanded={menu}
            aria-controls="menu-conversa"
            className="w-10 h-10 shrink-0 grid place-items-center rounded-full hover:bg-wa-bar-text/10 cursor-pointer"
          >
            <EllipsisVertical className="w-6 h-6" aria-hidden="true" />
          </button>
        )}
      </div>
      {menu && !c.isOwner && (
        <div id="menu-conversa" className="border-t border-wa-bar-text/15">
          <div className="max-w-3xl mx-auto px-2 sm:px-4 py-1.5">
            {c.ignored ? (
              <MenuItem
                icon={Bell}
                title="Reativar conversa"
                hint="A Margot volta a atender esta pessoa."
                onClick={c.blocked ? undefined : () => run("reativar")}
                disabled={c.blocked}
              />
            ) : (
              <MenuItem
                icon={BellOff}
                title="Ignorar conversa"
                hint="A Margot não responde, não avisa você e não conta como não lida. Fica na aba Ignoradas."
                onClick={() => run("ignorar")}
              />
            )}
            {c.blocked ? (
              <MenuItem
                icon={ShieldCheck}
                title="Desbloquear no WhatsApp"
                hint="A pessoa volta a poder escrever. A conversa continua ignorada até você reativar."
                onClick={() => run("desbloquear")}
              />
            ) : confirmBlock ? (
              <ConfirmBlock title={title} busy={busy} onConfirm={() => run("bloquear")} onCancel={() => setConfirmBlock(false)} />
            ) : (
              <MenuItem
                icon={Ban}
                title="Bloquear no WhatsApp"
                hint={
                  c.windowOpen
                    ? "A pessoa não consegue mais escrever para o número da Margot."
                    : "Só dá para bloquear quem escreveu nas últimas 24 horas."
                }
                onClick={() => setConfirmBlock(true)}
                disabled={!c.windowOpen}
              />
            )}
          </div>
        </div>
      )}
      {c.order && (
        <Link
          href={`/admin/pedidos/${c.order.id}`}
          className="flex items-center gap-1.5 border-t border-wa-bar-text/15 px-4 py-1.5 text-[13px] hover:bg-wa-bar-text/10"
        >
          <span className="min-w-0 flex-1 truncate max-w-3xl mx-auto w-full">
            Pedido #{c.order.id} · {c.order.statusLabel}
            {c.order.eventDate ? ` · ${formatDateBR(c.order.eventDate)}` : ""}
          </span>
          <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </Link>
      )}
    </header>
  );
}

function Composer({
  c,
  id,
  acting,
  act,
  onSent,
}: {
  c: ConversationSummary;
  id: string;
  /** Há um pedido da barra de cima em andamento (pausar, ignorar, bloquear…). */
  acting: boolean;
  act: Act;
  onSent: (next: Conversation) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (c.isOwner) {
    return (
      <div className="sticky bottom-0 z-30 bg-wa-composer pb-[env(safe-area-inset-bottom)]">
        <p className="max-w-3xl mx-auto px-4 py-3 text-xs text-wa-placeholder">
          Esta é a sua conversa com a Margot. Fale com ela pelo seu WhatsApp, mandando mensagem para o número dela.
        </p>
      </div>
    );
  }

  // Bloqueada: o WhatsApp não entrega nada a ela. Em vez de uma caixa de texto que falharia, o caminho de volta.
  if (c.blocked) {
    return (
      <div className="sticky bottom-0 z-30 bg-wa-composer pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--wa-shadow)]">
        <div className="max-w-3xl mx-auto px-2 sm:px-4 py-2 flex flex-wrap items-center gap-3">
          <p className="flex-1 min-w-48 rounded-lg bg-wa-notice px-3 py-2 text-xs text-wa-notice-text">
            Bloqueada no WhatsApp. Desbloqueie para voltar a conversar.
          </p>
          <button
            type="button"
            disabled={acting}
            onClick={() => act({ acao: "desbloquear" })}
            className="h-10 px-4 rounded-full inline-flex items-center gap-1.5 bg-wa-send text-wa-send-text text-sm font-medium cursor-pointer disabled:opacity-60"
          >
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Desbloquear
          </button>
        </div>
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
    <div className="sticky bottom-0 z-30 bg-wa-composer pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--wa-shadow)]">
      <div className="max-w-3xl mx-auto px-2 sm:px-4 py-2 space-y-1.5">
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
                className="flex-1 resize-none rounded-[22px] bg-wa-input px-4 py-2.5 text-base sm:text-[15px] leading-5 text-wa-input-text placeholder:text-wa-placeholder"
              />
              <button
                type="button"
                onClick={sendNow}
                disabled={busy || !text.trim()}
                aria-label="Enviar"
                className="w-11 h-11 shrink-0 rounded-full grid place-items-center bg-wa-send text-wa-send-text cursor-pointer disabled:opacity-50"
              >
                <Send className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <p className="px-2 text-center text-[11px] text-wa-placeholder">
              Sai pelo número da Margot, assinado como você.{" "}
              {c.ignored
                ? "Ao responder, a conversa deixa de ser ignorada e a Margot pausa nela por 24h."
                : "A Margot pausa nesta conversa por 24h."}
            </p>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 min-w-48 rounded-lg bg-wa-notice px-3 py-2 text-xs text-wa-notice-text">
              A pessoa não escreve há mais de 24h. Pelas regras do WhatsApp, o número da Margot não pode puxar conversa; responda pelo seu.
            </p>
            <a
              href={whatsappLink(c.waId)}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 rounded-full inline-flex items-center bg-wa-send text-wa-send-text text-sm font-medium"
            >
              Abrir no meu WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
