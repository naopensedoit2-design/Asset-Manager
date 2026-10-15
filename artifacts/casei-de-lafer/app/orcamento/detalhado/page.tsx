"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { ArrowUp, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface State {
  conversationId: string;
  messages: Message[];
  orderId: number | null;
  whatsappUrl: string | null;
  encaminhado: boolean;
}

const GREETING: Message = {
  role: "assistant",
  content:
    "Olá! Eu sou a Margot, da Eu Casei de Lafer. Vou montar o seu orçamento em poucos minutos. Para começar: qual é a data do casamento?",
};

const SUGGESTIONS = ["Quero ver se a minha data está livre", "Quanto custa a chegada da noiva?", "Como funciona a saída dos noivos?"];

const STORAGE_KEY = "margot-conversa-v1";
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const emptyState = (): State => ({ conversationId: newId(), messages: [GREETING], orderId: null, whatsappUrl: null, encaminhado: false });

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const saved = JSON.parse(raw);
    // Conversas com mais de 3 dias recomeçam do zero.
    if (!saved?.savedAt || Date.now() - saved.savedAt > 3 * 86_400_000) return emptyState();
    return { ...emptyState(), ...saved.state };
  } catch {
    return emptyState();
  }
}

function save(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, savedAt: Date.now() }));
  } catch {
    /* navegador sem armazenamento: a conversa só não sobrevive a um recarregamento */
  }
}

export default function OrcamentoDetalhado() {
  const [state, setState] = useState<State>(emptyState);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setState(load());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) save(state);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state, loaded]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    const messages: Message[] = [...state.messages, { role: "user", content }];
    setState((s) => ({ ...s, messages }));
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/margot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A saudação inicial é só da tela; a conversa enviada começa na primeira fala do cliente.
        body: JSON.stringify({ messages: messages.slice(1), orderId: state.orderId, conversationId: state.conversationId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.erro?.mensagem);
      const d = json.data;
      setState((s) => ({
        ...s,
        messages: [...s.messages, { role: "assistant", content: d.reply }],
        orderId: d.orderId ?? s.orderId,
        whatsappUrl: d.whatsappUrl ?? s.whatsappUrl,
        encaminhado: s.encaminhado || d.encaminhado,
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            role: "assistant",
            content: (e as Error).message || "Não consegui responder agora. Pode tentar de novo em instantes?",
          },
        ],
      }));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function restart() {
    if (!window.confirm("Começar uma nova conversa?")) return;
    setState(emptyState());
  }

  const showWhatsapp = (state.orderId || state.encaminhado) && state.whatsappUrl;
  const started = state.messages.length > 1;

  return (
    <div className="min-h-[100dvh] bg-bg-primary flex flex-col">
      <header className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <div
            aria-hidden
            className="w-10 h-10 rounded-full border border-gold/60 bg-gold-muted flex items-center justify-center font-serif text-gold text-lg"
          >
            M
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-serif text-text-primary leading-tight">Margot</p>
            <p className="text-xs text-text-muted truncate">Orçamento detalhado</p>
          </div>
          {started && (
            <button onClick={restart} aria-label="Nova conversa" className="p-2 text-text-muted hover:text-gold cursor-pointer">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <Link href="/" className="text-sm text-text-secondary hover:text-gold whitespace-nowrap">
            Ver o site
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6" aria-live="polite">
        <ol className="space-y-3">
          {state.messages.map((m, i) => (
            <li key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-gold-muted border border-gold/30 text-text-primary rounded-br-sm"
                    : "bg-bg-card border border-border-subtle text-text-primary rounded-bl-sm"
                }`}
              >
                {m.content}
              </p>
            </li>
          ))}
          {sending && (
            <li className="flex justify-start">
              <p className="rounded-2xl rounded-bl-sm bg-bg-card border border-border-subtle px-4 py-3 text-sm text-text-muted">
                Margot está escrevendo…
              </p>
            </li>
          )}
        </ol>

        {!started && (
          <div className="flex flex-wrap gap-2 mt-5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-sm border border-border-gold text-gold rounded-full px-4 py-2 hover:bg-gold-muted transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {showWhatsapp && (
          <div className="mt-6 border border-border-gold bg-bg-card rounded-xl p-4 sm:p-5">
            <p className="font-serif text-lg text-text-primary">
              {state.orderId ? "Seu orçamento está registrado" : "Continue com o Leonardo"}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {state.orderId
                ? "Para garantir a data, fale com o Leonardo no WhatsApp. Ele já recebeu o seu pedido."
                : "Ele responde pessoalmente pelo WhatsApp."}
            </p>
            <a
              href={state.whatsappUrl!}
              target="_blank"
              rel="noreferrer"
              className="mt-4 w-full inline-flex items-center justify-center gap-3 bg-gold hover:bg-gold-light text-black font-semibold text-sm py-3.5 rounded transition-colors"
            >
              <FaWhatsapp className="w-5 h-5" /> Falar com o Leonardo
            </a>
          </div>
        )}
        <div ref={endRef} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 bg-bg-primary/95 backdrop-blur border-t border-border-subtle"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-end gap-2">
          <label htmlFor="margot-input" className="sr-only">
            Sua mensagem
          </label>
          <textarea
            id="margot-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={1500}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Escreva para a Margot…"
            className="flex-1 resize-none max-h-32 bg-bg-card border border-border-subtle text-text-primary placeholder-text-muted rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-gold/60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Enviar"
            className="shrink-0 w-12 h-12 rounded-full bg-gold hover:bg-gold-light disabled:opacity-30 text-black flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
