"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import {
  calcQuote,
  formatBRL,
  formatDateBR,
  parseBRLToCents,
  STATUS_LABELS,
  type OrderStatus,
  type Settings,
} from "@/lib/gestor/rules";
import type { OrderView } from "@/lib/gestor/service";
import {
  AdminHeader,
  api,
  Button,
  ErrorNote,
  Field,
  inputClass,
  Loading,
  Panel,
  StatusBadge,
  whatsappLink,
} from "@/components/gestor/ui";

interface Service {
  id: number;
  name: string;
  priceCents: number;
  isAddon: boolean;
  active: boolean;
}

const PAYMENT_LABEL: Record<string, string> = { sinal: "Sinal", saldo: "Saldo", outro: "Pagamento" };
const PAYMENT_STATUS: Record<string, { label: string; tone: string }> = {
  a_receber: { label: "A receber", tone: "text-amber-300" },
  recebido: { label: "Recebido", tone: "text-emerald-300" },
  atrasado: { label: "Atrasado", tone: "text-red-300" },
  cancelado: { label: "Cancelado", tone: "text-text-muted line-through" },
};
const ACTOR_LABEL: Record<string, string> = { admin: "Você", margot: "Margot", sistema: "Sistema" };

/** Rótulo do botão de ação para cada status de destino. */
const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  orcamento_enviado: "Marcar orçamento enviado",
  aguardando_resposta: "Aguardando resposta",
  reservado: "Reservar a data",
  confirmado: "Confirmar (sinal pago)",
  realizado: "Marcar como realizado",
  novo: "Reabrir pedido",
  perdido: "Marcar como perdido",
  cancelado: "Cancelar pedido",
};

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const key = ["gestor-pedido", id];
  const { data: order, error, isLoading } = useQuery<OrderView>({
    queryKey: key,
    queryFn: () => api(`/api/admin/gestor/pedidos/${id}`),
  });

  function refresh(next?: OrderView) {
    if (next) queryClient.setQueryData(key, next);
    queryClient.invalidateQueries({ queryKey: ["gestor-resumo"] });
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <AdminHeader active="pedido" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <Link href="/admin/dashboard" className="text-sm text-text-muted hover:text-text-primary">
          ← Voltar à gestão
        </Link>
        {isLoading && <Loading />}
        {error && <ErrorNote message={(error as Error).message} />}
        {order && (
          <>
            <Summary order={order} onChange={refresh} />
            <QuoteSection order={order} onChange={refresh} />
            <PaymentsSection order={order} onChange={refresh} />
            <DetailsSection order={order} onChange={refresh} />
            <History order={order} />
          </>
        )}
      </main>
    </div>
  );
}

// ─── Resumo e ações de status ────────────────────────────────

function Summary({ order, onChange }: { order: OrderView; onChange: (o: OrderView) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(to: OrderStatus) {
    if ((to === "perdido" || to === "cancelado") && !window.confirm(`${ACTION_LABEL[to]}? A data reservada será liberada.`)) return;
    setBusy(to);
    setError(null);
    try {
      onChange(await api(`/api/admin/gestor/pedidos/${order.id}/status`, { body: { status: to } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const positive = order.proximosStatus.filter((s) => s !== "perdido" && s !== "cancelado");
  const negative = order.proximosStatus.filter((s) => s === "perdido" || s === "cancelado");
  const firstName = order.client.name.split(" ")[0];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-3xl sm:text-4xl text-text-primary">{order.client.name}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {order.eventDate ? formatDateBR(order.eventDate) : "Data a definir"}
            {order.eventTime && ` às ${order.eventTime}`}
            {(order.venue || order.city) && ` · ${[order.venue, order.city].filter(Boolean).join(", ")}`}
          </p>
          {order.reserva && (
            <p className="text-sm mt-1 text-gold">
              {order.reserva.kind === "confirmada"
                ? "Data garantida e bloqueada no site"
                : `Reserva provisória até ${new Date(order.reserva.expiresAt!).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}`}
            </p>
          )}
        </div>
        <a href={whatsappLink(order.client.phone, `Olá, ${firstName}!`)} target="_blank" rel="noreferrer">
          <Button variant="ghost">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </Button>
        </a>
      </div>

      {order.proximosStatus.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {positive.map((s) => (
            <Button key={s} onClick={() => go(s)} disabled={!!busy} variant={s === "confirmado" || s === "reservado" ? "gold" : "ghost"}>
              {busy === s ? "Salvando…" : ACTION_LABEL[s] ?? STATUS_LABELS[s]}
            </Button>
          ))}
          {negative.map((s) => (
            <Button key={s} onClick={() => go(s)} disabled={!!busy} variant="danger">
              {busy === s ? "Salvando…" : ACTION_LABEL[s]}
            </Button>
          ))}
        </div>
      )}
      <ErrorNote message={error} />
    </section>
  );
}

// ─── Orçamento ───────────────────────────────────────────────

function QuoteSection({ order, onChange }: { order: OrderView; onChange: (o: OrderView) => void }) {
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["gestor-servicos"],
    queryFn: () => api("/api/admin/gestor/servicos"),
  });
  const { data: settings } = useQuery<Settings>({
    queryKey: ["gestor-regras"],
    queryFn: () => api("/api/admin/gestor/regras"),
  });
  const latest = order.quotes[0];
  const [open, setOpen] = useState(!latest);
  const [selected, setSelected] = useState<number[]>(order.serviceIds);
  const [discount, setDiscount] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setSelected(order.serviceIds), [order.serviceIds]);

  const items = services
    .filter((s) => selected.includes(s.id))
    .map((s) => ({ serviceId: s.id, name: s.name, priceCents: s.priceCents }));
  const discountCents = discount ? parseBRLToCents(discount) ?? -1 : 0;
  let preview: ReturnType<typeof calcQuote> | null = null;
  let previewError: string | null = null;
  try {
    if (settings && items.length) preview = calcQuote(items, discountCents, settings.depositPercent);
  } catch (e) {
    previewError = (e as Error).message;
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const result = await api<{ order: OrderView }>(`/api/admin/gestor/pedidos/${order.id}/orcamento`, {
        body: { serviceIds: selected, discountCents: Math.max(0, discountCents), pdfUrl },
      });
      onChange(result.order);
      setOpen(false);
      setDiscount("");
      setPdfUrl("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Orçamento"
      action={
        latest && !open ? (
          <Button variant="ghost" onClick={() => setOpen(true)}>
            Novo orçamento
          </Button>
        ) : undefined
      }
    >
      {latest && (
        <div className="bg-bg-elevated rounded p-4 mb-4">
          <ul className="space-y-1 text-sm">
            {latest.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span className="text-text-secondary">{i.name}</span>
                <span className="text-text-primary">{formatBRL(i.priceCents)}</span>
              </li>
            ))}
            {latest.discountCents > 0 && (
              <li className="flex justify-between gap-3">
                <span className="text-text-secondary">Desconto</span>
                <span className="text-text-primary">− {formatBRL(latest.discountCents)}</span>
              </li>
            )}
          </ul>
          <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-border-subtle">
            <span className="text-sm text-text-secondary">Total</span>
            <span className="font-serif text-2xl text-gold">{formatBRL(latest.totalCents)}</span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Sinal {formatBRL(latest.depositCents)} · enviado {latest.sentAt ? new Date(latest.sentAt).toLocaleDateString("pt-BR") : "—"}
            {latest.validUntil && ` · válido até ${formatDateBR(latest.validUntil)}`}
            {latest.pdfUrl && (
              <>
                {" · "}
                <a href={latest.pdfUrl} target="_blank" rel="noreferrer" className="text-gold underline">
                  ver PDF
                </a>
              </>
            )}
          </p>
          {order.quotes.length > 1 && <p className="text-xs text-text-muted mt-1">{order.quotes.length - 1} orçamento(s) anterior(es)</p>}
        </div>
      )}

      {open && (
        <div className="space-y-4">
          <div className="space-y-2">
            {services
              .filter((s) => s.active || selected.includes(s.id))
              .map((s) => (
                <label key={s.id} className="flex items-center gap-3 bg-bg-elevated border border-border-subtle rounded px-3 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-gold"
                    checked={selected.includes(s.id)}
                    onChange={() =>
                      setSelected((ids) => (ids.includes(s.id) ? ids.filter((x) => x !== s.id) : [...ids, s.id]))
                    }
                  />
                  <span className="flex-1 text-sm text-text-primary">{s.name}</span>
                  <span className="text-sm text-text-secondary">{formatBRL(s.priceCents)}</span>
                </label>
              ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Desconto (R$)">
              <input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0,00" className={inputClass} />
            </Field>
            <Field label="Link do PDF (opcional)">
              <input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://" className={inputClass} />
            </Field>
          </div>
          {preview && (
            <p className="text-sm text-text-secondary">
              Total <span className="text-gold font-serif text-xl">{formatBRL(preview.totalCents)}</span> · sinal de{" "}
              {settings?.depositPercent}% = {formatBRL(preview.depositCents)}
            </p>
          )}
          <ErrorNote message={error ?? previewError} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !preview}>
              {saving ? "Salvando…" : "Registrar orçamento enviado"}
            </Button>
            {latest && (
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ─── Pagamentos ──────────────────────────────────────────────

function PaymentsSection({ order, onChange }: { order: OrderView; onChange: (o: OrderView) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ kind: "outro", amount: "", dueDate: "" });

  async function update(paymentId: number, body: Record<string, unknown>) {
    setBusy(paymentId);
    setError(null);
    setNotice(null);
    try {
      const next = await api<OrderView & { aviso: string | null }>(`/api/admin/gestor/pagamentos/${paymentId}`, {
        method: "PATCH",
        body,
      });
      onChange(next);
      if (next.aviso) setNotice(next.aviso);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function add() {
    const amountCents = parseBRLToCents(draft.amount);
    if (!amountCents) return setError("Informe o valor.");
    setError(null);
    try {
      onChange(
        await api(`/api/admin/gestor/pedidos/${order.id}/pagamentos`, {
          body: { kind: draft.kind, amountCents, dueDate: draft.dueDate || null },
        }),
      );
      setAdding(false);
      setDraft({ kind: "outro", amount: "", dueDate: "" });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const paid = order.payments.filter((p) => p.status === "recebido").reduce((s, p) => s + p.amountCents, 0);
  const total = order.quotes[0]?.totalCents ?? 0;

  return (
    <Panel
      title="Pagamentos"
      action={
        !adding ? (
          <Button variant="ghost" onClick={() => setAdding(true)}>
            Adicionar
          </Button>
        ) : undefined
      }
    >
      {total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Recebido</span>
            <span className="text-text-primary">
              {formatBRL(paid)} de {formatBRL(total)}
            </span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gold" style={{ width: `${Math.min(100, (paid / total) * 100)}%` }} />
          </div>
        </div>
      )}
      {order.payments.length === 0 && !adding && (
        <p className="text-sm text-text-muted">
          Sinal e saldo são criados automaticamente quando você reserva a data com um orçamento registrado.
        </p>
      )}
      <ul className="space-y-2">
        {order.payments.map((p) => {
          const st = PAYMENT_STATUS[p.status] ?? { label: p.status, tone: "" };
          const open = p.status === "a_receber" || p.status === "atrasado";
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 bg-bg-elevated rounded px-3 py-3">
              <div className="flex-1 min-w-[10rem]">
                <p className="text-sm text-text-primary">
                  {PAYMENT_LABEL[p.kind] ?? p.kind} · {formatBRL(p.amountCents)}
                </p>
                <p className="text-xs text-text-muted">
                  <span className={st.tone}>{st.label}</span>
                  {p.dueDate && ` · vence ${formatDateBR(p.dueDate)}`}
                  {p.paidAt && ` · pago em ${new Date(p.paidAt).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              {open && (
                <div className="flex gap-2">
                  <Button onClick={() => update(p.id, { status: "recebido" })} disabled={busy === p.id}>
                    {busy === p.id ? "Salvando…" : "Recebi"}
                  </Button>
                  <Button variant="ghost" onClick={() => update(p.id, { status: "cancelado" })} disabled={busy === p.id}>
                    Cancelar
                  </Button>
                </div>
              )}
              {p.status === "recebido" && (
                <button
                  onClick={() => update(p.id, { status: "a_receber" })}
                  className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer"
                >
                  Desfazer
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {adding && (
        <div className="grid sm:grid-cols-4 gap-3 mt-4 items-end">
          <Field label="Tipo">
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className={inputClass}>
              <option value="sinal">Sinal</option>
              <option value="saldo">Saldo</option>
              <option value="outro">Outro</option>
            </select>
          </Field>
          <Field label="Valor (R$)">
            <input inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Vencimento">
            <input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} className={inputClass} />
          </Field>
          <div className="flex gap-2">
            <Button onClick={add}>Salvar</Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      <div className="mt-3 space-y-2">
        <ErrorNote message={error} />
        {notice && <p className="text-sm text-amber-300">{notice}</p>}
      </div>
    </Panel>
  );
}

// ─── Dados do cliente e do evento ────────────────────────────

function DetailsSection({ order, onChange }: { order: OrderView; onChange: (o: OrderView) => void }) {
  const initial = () => ({
    name: order.client.name,
    phone: order.client.phone,
    email: order.client.email,
    referredBy: order.client.referredBy,
    eventDate: order.eventDate ?? "",
    eventTime: order.eventTime,
    venue: order.venue,
    city: order.city,
    notes: order.notes,
  });
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setForm(initial()), [order.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: keyof ReturnType<typeof initial>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const next = await api<OrderView>(`/api/admin/gestor/pedidos/${order.id}`, {
        method: "PATCH",
        body: {
          eventDate: form.eventDate || null,
          eventTime: form.eventTime,
          venue: form.venue,
          city: form.city,
          notes: form.notes,
          client: { name: form.name, phone: form.phone, email: form.email, referredBy: form.referredBy },
        },
      });
      onChange(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Dados do pedido">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nome">
          <input value={form.name} onChange={set("name")} className={inputClass} />
        </Field>
        <Field label="WhatsApp">
          <input value={form.phone} onChange={set("phone")} inputMode="tel" className={inputClass} />
        </Field>
        <Field label="E-mail">
          <input value={form.email} onChange={set("email")} type="email" className={inputClass} />
        </Field>
        <Field label="Quem indicou">
          <input value={form.referredBy} onChange={set("referredBy")} className={inputClass} />
        </Field>
        <Field label="Data do evento" hint={order.reserva ? "Libere a reserva para trocar a data." : undefined}>
          <input type="date" value={form.eventDate} onChange={set("eventDate")} disabled={!!order.reserva} className={inputClass} />
        </Field>
        <Field label="Horário">
          <input type="time" value={form.eventTime} onChange={set("eventTime")} className={inputClass} />
        </Field>
        <Field label="Local da cerimônia">
          <input value={form.venue} onChange={set("venue")} className={inputClass} />
        </Field>
        <Field label="Cidade">
          <input value={form.city} onChange={set("city")} className={inputClass} />
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <textarea rows={3} value={form.notes} onChange={set("notes")} className={`${inputClass} resize-none`} />
        </Field>
      </div>
      <div className="mt-4 space-y-3">
        <ErrorNote message={error} />
        <Button onClick={save} disabled={saving}>
          {saved ? "Salvo" : saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </Panel>
  );
}

// ─── Histórico ───────────────────────────────────────────────

function History({ order }: { order: OrderView }) {
  return (
    <Panel title="Histórico">
      <ol className="space-y-3">
        {order.history.map((h) => (
          <li key={h.id} className="flex gap-3 text-sm">
            <span className="text-text-muted whitespace-nowrap w-24 shrink-0">
              {new Date(h.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </span>
            <span className="text-text-secondary">
              {h.fromStatus ? `${STATUS_LABELS[h.fromStatus as OrderStatus] ?? h.fromStatus} → ` : ""}
              <span className="text-text-primary">{STATUS_LABELS[h.toStatus as OrderStatus] ?? h.toStatus}</span>
              {h.note && <span className="text-text-muted"> — {h.note}</span>}
              <span className="text-text-muted"> · {ACTOR_LABEL[h.actor] ?? h.actor}</span>
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
