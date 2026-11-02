"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  Camera,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  Clock,
  ExternalLink,
  Images,
  Mail,
  MessageCircle,
  RotateCw,
  Wallet,
  Webhook,
} from "lucide-react";
import { api, Button, ErrorNote } from "@/components/gestor/ui";
import { Chip, PageTitle, Skeleton, TONE_BAR, TONE_TEXT, type Tone } from "@/components/admin/ui";
import { groupConnections, type ConnKey, type Connection, type ConnState } from "@/lib/admin/conexoes";
import type { ConexoesData } from "@/lib/admin/conexoes-service";
import { canSendText, type PhoneHealth } from "@/lib/wa/health";

const ICON: Record<ConnKey, typeof Bot> = {
  whatsapp: MessageCircle,
  agenda: CalendarDays,
  financeiro: Wallet,
  rotina: Clock,
  ia: Bot,
  instagram: Camera,
  metricool: ChartColumn,
  gmail: Mail,
  api: Webhook,
  fotos: Images,
};

const SHORT: Record<ConnKey, string> = {
  whatsapp: "WhatsApp",
  agenda: "Agenda",
  financeiro: "Dinheiro",
  rotina: "Rotina 7h",
  ia: "IA",
  instagram: "Instagram",
  metricool: "Metricool",
  gmail: "Gmail",
  api: "API",
  fotos: "Fotos",
};

const STATE: Record<ConnState, { tone: Tone; chip: string }> = {
  ok: { tone: "ok", chip: "Em dia" },
  atencao: { tone: "warn", chip: "Atenção" },
  falta: { tone: "bad", chip: "Falta" },
  fora: { tone: "info", chip: "Fora do painel" },
};

const STEPS_TITLE: Record<ConnState, string> = {
  ok: "Como funciona",
  atencao: "Como resolver",
  falta: "Como conectar",
  fora: "Como trazer para o painel",
};

export default function ConnectionsPage() {
  const { data, error, isLoading, refetch, isFetching } = useQuery<ConexoesData>({
    queryKey: ["conexoes"],
    queryFn: () => api("/api/admin/gestor/conexoes"),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const groups = data ? groupConnections(data.conexoes) : null;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      <PageTitle
        title="Conexões"
        hint={
          groups
            ? groups.atencao.length
              ? `${groups.atencao.length} ${groups.atencao.length === 1 ? "item pede" : "itens pedem"} a sua ação.`
              : "Tudo o que roda no painel está em dia."
            : "O que está ligado ao negócio e o que ainda falta."
        }
        right={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Atualizar as conexões"
            className="shrink-0 grid w-11 h-11 place-items-center rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-elevated cursor-pointer disabled:cursor-wait"
          >
            <RotateCw className={`w-[18px] h-[18px] ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        }
      />

      {isLoading ? (
        <div className="space-y-3" role="status" aria-label="Carregando as conexões">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error || !data || !groups ? (
        <ErrorNote message={(error as Error | null)?.message ?? "Não foi possível carregar as conexões."} />
      ) : (
        <div className="space-y-8">
          <Overview list={data.conexoes} />

          {groups.atencao.length > 0 && (
            <Group title="Pedem a sua ação">
              {groups.atencao.map((c) => (
                <ConnectionCard key={c.key} c={c} />
              ))}
            </Group>
          )}
          {groups.funcionando.length > 0 && (
            <Group title="Funcionando">
              {groups.funcionando.map((c) => (
                <ConnectionCard key={c.key} c={c} />
              ))}
            </Group>
          )}
          {groups.fora.length > 0 && (
            <Group title="Fora do painel" hint="Funcionam por outro caminho ou são opcionais.">
              {groups.fora.map((c) => (
                <ConnectionCard key={c.key} c={c} />
              ))}
            </Group>
          )}

          <p className="text-xs leading-relaxed text-text-muted">
            Esta tela lê só a configuração do sistema: ela não liga para a Meta nem para o Google sozinha. Use “Conferir agora” quando quiser um teste de verdade.
            Os valores das chaves nunca aparecem aqui, só os nomes das que faltam.
          </p>
        </div>
      )}
    </main>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-xl text-text-primary">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-text-secondary">{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

/** Mapa de uma olhada: um ícone por conexão, com a bolinha do estado. Toca e desce até o cartão. */
function Overview({ list }: { list: Connection[] }) {
  return (
    <nav aria-label="Mapa das conexões">
      <ul className="grid grid-cols-5 gap-2">
        {list.map((c) => {
          const Icon = ICON[c.key];
          const st = STATE[c.state];
          return (
            <li key={c.key}>
              <a
                href={`#conn-${c.key}`}
                className="relative flex flex-col items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-card px-1 py-3 text-center transition-colors hover:border-border-gold"
              >
                <span aria-hidden="true" className={`absolute right-2 top-2 w-2.5 h-2.5 rounded-full ${TONE_BAR[st.tone]}`} />
                <Icon className="w-[22px] h-[22px] text-text-primary" aria-hidden="true" />
                <span className="text-[11px] leading-none text-text-secondary">{SHORT[c.key]}</span>
                <span className="sr-only">{st.chip}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface CheckResult {
  tone: Tone;
  text: string;
}

const TZ = "America/Sao_Paulo";

/** Teste de verdade: chama a Meta ou o Google (as mesmas verificações do cartão em Regras). */
async function runCheck(kind: "whatsapp" | "agenda"): Promise<CheckResult> {
  if (kind === "agenda") {
    const g = await api<{ configurada: boolean; motivo?: string; ok?: boolean; erro?: string | null; diasOcupados?: number }>("/api/admin/gestor/google");
    if (!g.configurada) return { tone: "warn", text: `Ainda não configurada. ${g.motivo ?? ""}`.trim() };
    if (g.ok) return { tone: "ok", text: `O Google respondeu. ${g.diasOcupados ?? 0} dia(s) ocupado(s) nos próximos 2 anos.` };
    return { tone: "bad", text: `Configurada, mas o Google recusou: ${g.erro ?? "erro desconhecido"}` };
  }
  const w = await api<{
    configurado: boolean;
    faltando: string[];
    erro: string | null;
    saude: { health: PhoneHealth | null } | null;
    ultimoWebhook: string | null;
  }>("/api/admin/whatsapp/status");
  if (!w.configurado) return { tone: "warn", text: `Ainda não configurado. Faltam: ${w.faltando.join(", ")}.` };
  if (w.erro) return { tone: "bad", text: `Configurado, mas a Meta recusou: ${w.erro}` };
  const envio = canSendText(w.saude?.health);
  const last = w.ultimoWebhook
    ? new Date(w.ultimoWebhook).toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" })
    : "nenhuma ainda";
  return { tone: envio.tone === "bad" ? "bad" : envio.tone === "warn" ? "warn" : "ok", text: `A Meta respondeu. Pode enviar: ${envio.text}. Última mensagem recebida: ${last}.` };
}

function ConnectionCard({ c }: { c: Connection }) {
  const Icon = ICON[c.key];
  const st = STATE[c.state];
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  async function check() {
    if (!c.check) return;
    setBusy(true);
    setResult(null);
    try {
      setResult(await runCheck(c.check));
    } catch (e) {
      setResult({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article id={`conn-${c.key}`} className="scroll-mt-20 rounded-lg border border-border-subtle bg-bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid w-10 h-10 shrink-0 place-items-center rounded-lg bg-bg-elevated text-gold">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-lg leading-snug text-text-primary">{c.name}</h3>
            <Chip tone={st.tone} className="shrink-0">
              {st.chip}
            </Chip>
          </div>
          <p className={`mt-0.5 text-sm font-medium ${TONE_TEXT[st.tone]}`}>{c.headline}</p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-text-secondary">{c.detail}</p>

      {c.missing.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-text-secondary">{c.state === "fora" ? "Variável necessária na Vercel:" : "Faltam na Vercel:"}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {c.missing.map((m) => (
              <li key={m} className="rounded bg-bg-elevated px-2 py-1 font-mono text-xs text-text-primary break-all">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(c.check || c.link) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {c.check && (
            <Button variant="ghost" onClick={check} disabled={busy} className="min-h-11">
              {busy ? "Conferindo…" : "Conferir agora"}
            </Button>
          )}
          {c.link &&
            (c.link.external ? (
              <a
                href={c.link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded border border-border-subtle bg-bg-elevated px-4 text-sm text-text-primary transition-colors hover:border-border-gold"
              >
                {c.link.label}
                <ExternalLink className="w-4 h-4 text-text-secondary" aria-hidden="true" />
              </a>
            ) : (
              <Link
                href={c.link.href}
                className="inline-flex min-h-11 items-center gap-1.5 rounded border border-border-subtle bg-bg-elevated px-4 text-sm text-text-primary transition-colors hover:border-border-gold"
              >
                {c.link.label}
                <ChevronRight className="w-4 h-4 text-text-secondary" aria-hidden="true" />
              </Link>
            ))}
        </div>
      )}

      {result && (
        <p role="status" className={`mt-3 rounded border px-3 py-2 text-sm ${result.tone === "ok" ? "border-ok/40 bg-ok/5" : result.tone === "bad" ? "border-bad/40 bg-bad/5" : "border-warn/40 bg-warn/5"} text-text-primary`}>
          <span className={`font-medium ${TONE_TEXT[result.tone]}`}>{result.tone === "ok" ? "Deu certo. " : result.tone === "bad" ? "Não deu certo. " : "Atenção. "}</span>
          {result.text}
        </p>
      )}

      {c.steps.length > 0 && (
        <details className="group mt-4 border-t border-border-subtle pt-1">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm text-gold [&::-webkit-details-marker]:hidden">
            <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" aria-hidden="true" />
            {STEPS_TITLE[c.state]} ({c.steps.length} {c.steps.length === 1 ? "passo" : "passos"})
          </summary>
          <ol className="mt-2 space-y-3 pl-1">
            {c.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-text-secondary">
                <span aria-hidden="true" className="grid w-6 h-6 shrink-0 place-items-center rounded-full border border-border-gold text-xs tabular-nums text-gold">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">{s}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </article>
  );
}
