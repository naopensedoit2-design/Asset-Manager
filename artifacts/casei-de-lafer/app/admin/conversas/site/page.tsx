"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { api, ErrorNote, Loading } from "@/components/gestor/ui";
import { GUARDA_MESES, type ResumoDaConversa } from "@/lib/margot/site-conversas";

interface Fala {
  papel: string;
  texto: string;
  em: string;
  pedido: number | null;
}

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(
    new Date(iso),
  );

function Conversa({ id }: { id: string }) {
  const { data, error, isLoading } = useQuery<Fala[]>({
    queryKey: ["site-conversa", id],
    queryFn: () => api(`/api/admin/site-conversas/${encodeURIComponent(id)}`),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorNote message={(error as Error).message} />;
  return (
    <ol className="space-y-2 pt-3">
      {(data ?? []).map((f, i) => (
        <li key={i} className={`flex ${f.papel === "cliente" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[88%] rounded-lg px-3 py-2 text-[15px] leading-relaxed whitespace-pre-line border ${
              f.papel === "cliente" ? "bg-gold-muted border-gold/30 text-text-primary" : "bg-bg-elevated border-border-subtle text-text-primary"
            }`}
          >
            <p className="text-sm text-text-muted mb-1">
              {f.papel === "cliente" ? "Cliente" : "Margot"} · {quando(f.em)}
            </p>
            {f.texto}
          </div>
        </li>
      ))}
    </ol>
  );
}

// Conversas do chat do site (/orcamento/detalhado), guardadas por 6 meses. Só leitura.
export default function ConversasDoSite() {
  const [aberta, setAberta] = useState<string | null>(null);
  const { data, error, isLoading } = useQuery<ResumoDaConversa[]>({
    queryKey: ["site-conversas"],
    queryFn: () => api("/api/admin/site-conversas"),
    refetchInterval: 30_000,
  });

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      <div>
        <Link href="/admin/conversas" className="text-sm text-text-muted hover:text-gold inline-flex items-center min-h-11">
          ← Conversas do WhatsApp
        </Link>
        <h1 className="font-serif text-3xl text-text-primary">Chat do site</h1>
        <p className="text-sm text-text-muted mt-1">
          Conversas com a Margot no site. Ficam guardadas por {GUARDA_MESES} meses e depois são apagadas sozinhas.
        </p>
      </div>

      {isLoading && <Loading />}
      <ErrorNote message={error ? (error as Error).message : null} />
      {data && data.length === 0 && <p className="text-sm text-text-muted py-8 text-center">Nenhuma conversa no chat do site ainda.</p>}

      <ul className="space-y-3">
        {(data ?? []).map((c) => {
          const aberto = aberta === c.id;
          return (
            <li key={c.id} className="bg-bg-card border border-border-subtle rounded-lg">
              <button
                type="button"
                onClick={() => setAberta(aberto ? null : c.id)}
                aria-expanded={aberto}
                className="w-full text-left px-4 py-3 min-h-11 flex items-start gap-3 cursor-pointer"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-text-primary text-[15px] truncate">{c.abertura || "(sem texto do cliente)"}</span>
                  <span className="block text-sm text-text-muted mt-0.5">
                    {quando(c.ultima)} · {c.falas} {c.falas === 1 ? "mensagem" : "mensagens"}
                  </span>
                </span>
                {c.pedido && (
                  <Link
                    href={`/admin/pedidos/${c.pedido}`}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 text-sm text-gold border border-border-gold rounded px-2 py-1"
                  >
                    Pedido #{c.pedido}
                  </Link>
                )}
                {aberto ? <ChevronUp className="w-5 h-5 text-text-muted shrink-0" /> : <ChevronDown className="w-5 h-5 text-text-muted shrink-0" />}
              </button>
              {aberto && (
                <div className="px-4 pb-4 border-t border-border-subtle">
                  <Conversa id={c.id} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
