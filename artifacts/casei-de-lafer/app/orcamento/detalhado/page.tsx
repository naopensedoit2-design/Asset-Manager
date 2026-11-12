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
    <div className="margot">
      <header className="topo">
        <div className="miolo">
          <div aria-hidden className="selo">
            M
          </div>
          <div className="quem">
            <b>Margot</b>
            <span>Orçamento detalhado</span>
          </div>
          {started && (
            <button onClick={restart} aria-label="Nova conversa" className="acao-topo icone">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <Link href="/" className="acao-topo">
            Ver o site
          </Link>
        </div>
      </header>

      <main className="conversa miolo" aria-live="polite">
        <ol className="falas">
          {state.messages.map((m, i) => (
            <li key={i} className={`fala entra ${m.role === "user" ? "cliente" : "margot-fala"}`}>
              <p>{m.content}</p>
            </li>
          ))}
          {sending && (
            <li className="fala margot-fala escrevendo entra">
              <p>Margot está escrevendo…</p>
            </li>
          )}
        </ol>

        {!started && (
          <div className="sugestoes">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="sugestao">
                {s}
              </button>
            ))}
          </div>
        )}

        {showWhatsapp && (
          <div className="cartao">
            <h2>{state.orderId ? "Seu orçamento está registrado" : "Continue com a nossa equipe"}</h2>
            <p>
              {state.orderId
                ? "Para garantir a data, fale com a nossa equipe no WhatsApp. Ela já recebeu o seu pedido."
                : "Nossa equipe responde pessoalmente pelo WhatsApp."}
            </p>
            <a href={state.whatsappUrl!} target="_blank" rel="noreferrer">
              <FaWhatsapp className="w-5 h-5" /> Falar com a nossa equipe
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
        className="escrever"
      >
        <div className="miolo">
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
          />
          <button type="submit" disabled={sending || !input.trim()} aria-label="Enviar" className="enviar">
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
