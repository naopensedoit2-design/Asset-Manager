"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, Ban, GripVertical, MessageCircle, Pin, PinOff, PauseCircle, User } from "lucide-react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, ErrorNote, Loading, Panel } from "@/components/gestor/ui";
import { formatDateBR } from "@/lib/gestor/rules";
import { whenLabel, type ConversationSummary, type Status } from "@/components/gestor/wa";
import { Ticks } from "@/components/gestor/wa-message";
import { tom, type Tom } from "@/lib/wa/ordem";
import { ignoreLabel } from "@/lib/wa/triage";
import { initials, previewBody, previewWho } from "@/lib/wa/view";

type Filter = "todas" | "esperando" | "pausadas" | "ignoradas";

const LIST_KEY = ["wa-conversas"];
/** As listas e o contador do menu mudam quando uma conversa entra ou sai de "ignoradas", ou muda de lugar. */
const REFRESH_KEYS = ["wa-conversas", "wa-conversas-ignoradas", "wa-nao-lidas"];

// Cor de cada situação: faixa à esquerda da linha e contorno da foto. Classes escritas por extenso para o Tailwind enxergar.
const TOM_FAIXA: Record<Tom, string> = {
  dono: "border-l-gold",
  pedido: "border-l-gold/70",
  esperando: "border-l-info",
  pausada: "border-l-warn",
  aviso: "border-l-border-subtle",
  normal: "border-l-transparent",
};
const TOM_FOTO: Record<Tom, string> = {
  dono: "bg-gold text-bg-primary",
  pedido: "bg-bg-elevated text-gold-light border border-gold/60",
  esperando: "bg-bg-elevated text-info border border-info/60",
  pausada: "bg-bg-elevated text-warn border border-warn/60",
  aviso: "bg-bg-elevated text-text-muted border border-border-subtle",
  normal: "bg-bg-elevated text-text-secondary border border-border-subtle",
};

/** "Esperando resposta" de verdade: aviso do WhatsApp sem conteúdo (enquete, "ver uma vez"…) não pede resposta. */
const isWaiting = (c: ConversationSummary) => c.waiting && !c.onlyNotice;

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("todas");
  const [undo, setUndo] = useState<{ id: number; title: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const showingIgnored = filter === "ignoradas";
  const { data, error, isLoading } = useQuery<ConversationSummary[]>({
    queryKey: LIST_KEY,
    queryFn: () => api("/api/admin/whatsapp/conversas"),
    refetchInterval: 10_000,
  });
  // As ignoradas só são buscadas quando a aba é aberta; o número da aba vem do contador leve (o mesmo do menu).
  const ignoredList = useQuery<ConversationSummary[]>({
    queryKey: ["wa-conversas-ignoradas"],
    queryFn: () => api("/api/admin/whatsapp/conversas?ignoradas=1"),
    refetchInterval: 10_000,
    enabled: showingIgnored,
  });
  const { data: counter } = useQuery<{ total: number; ignoradas?: number }>({
    queryKey: ["wa-nao-lidas"],
    queryFn: () => api("/api/admin/whatsapp/nao-lidas"),
    refetchInterval: 30_000,
    retry: false,
  });
  const { data: status } = useQuery<Status>({
    queryKey: ["wa-status-curto"],
    queryFn: () => api("/api/admin/whatsapp/status"),
    staleTime: 5 * 60_000,
  });

  // O aviso "Conversa ignorada. Desfazer" some sozinho.
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 7000);
    return () => clearTimeout(t);
  }, [undo]);

  const refresh = () => {
    for (const key of REFRESH_KEYS) queryClient.invalidateQueries({ queryKey: [key] });
  };

  async function patch(id: number, acao: string) {
    setActionError(null);
    try {
      await api(`/api/admin/whatsapp/conversas/${id}`, { method: "PATCH", body: { acao } });
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      refresh();
    }
  }

  async function ignore(c: ConversationSummary) {
    // Some da lista na hora; o servidor confirma em seguida.
    queryClient.setQueryData<ConversationSummary[]>(LIST_KEY, (old) => (old ?? []).filter((x) => x.id !== c.id));
    setUndo({ id: c.id, title: c.clientName || c.name || c.phone });
    await patch(c.id, "ignorar");
  }

  async function togglePin(c: ConversationSummary) {
    await patch(c.id, c.pinned ? "soltar" : "fixar");
  }

  async function reorder(ids: number[]) {
    // O servidor já devolve a lista na ordem; aqui a nova ordem aparece na hora, sem esperar.
    queryClient.setQueryData<ConversationSummary[]>(LIST_KEY, (old) => {
      const list = old ?? [];
      const position = new Map(ids.map((id, i) => [id, i]));
      const pinned = list.filter((c) => position.has(c.id)).sort((a, b) => position.get(a.id)! - position.get(b.id)!);
      const slots = list.map((c, i) => (position.has(c.id) ? i : -1)).filter((i) => i >= 0);
      const next = [...list];
      slots.forEach((slot, i) => (next[slot] = { ...pinned[i], pinOrder: i }));
      return next;
    });
    setActionError(null);
    try {
      await api("/api/admin/whatsapp/conversas/ordem", { method: "PUT", body: { ids } });
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      refresh();
    }
  }

  const all = data ?? [];
  const clients = all.filter((c) => !c.isOwner);
  const ignored = (ignoredList.data ?? []).filter((c) => !c.isOwner);
  const ignoredTotal = showingIgnored && ignoredList.data ? ignored.length : (counter?.ignoradas ?? 0);
  // "Todas" mostra a sua conversa com a Margot como a primeira linha; os outros filtros só têm conversas de clientes.
  const shown = showingIgnored ? ignored : filter === "todas" ? all : clients.filter((c) => (filter === "esperando" ? isWaiting(c) : c.paused));
  const counts = { esperando: clients.filter(isWaiting).length, pausadas: clients.filter((c) => c.paused).length };
  const listLoading = showingIgnored ? ignoredList.isLoading : isLoading;
  const listError = showingIgnored ? ignoredList.error : error;
  const canDrag = filter === "todas";
  const pinned = canDrag ? clients.filter((c) => c.pinned) : [];
  const ownerRow = canDrag ? all.find((c) => c.isOwner) : undefined;
  const others = canDrag ? clients.filter((c) => !c.pinned) : [];

  const sensors = useSensors(
    // Arrasta pelo ícone ≡ (ele tem touch-action: none), então rolar a lista com o dedo continua funcionando.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function lockSelection(on: boolean) {
    document.body.style.userSelect = on ? "none" : "";
  }
  function onDragEnd(e: DragEndEvent) {
    lockSelection(false);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = pinned.map((c) => c.id);
    const from = ids.indexOf(Number(active.id));
    const to = ids.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    void reorder(arrayMove(ids, from, to));
  }

  const actions = { onTogglePin: togglePin, onIgnore: ignore };

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
              ["ignoradas", `Ignoradas (${ignoredTotal})`],
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

        {showingIgnored && (
          <p className="text-sm text-text-muted">
            A Margot não responde nem avisa estas conversas, e elas não contam como não lidas. Toque numa para ler, reativar ou bloquear.
          </p>
        )}

        {actionError && <ErrorNote message={actionError} />}

        {listLoading ? (
          <Loading />
        ) : listError ? (
          <ErrorNote message={(listError as Error).message} />
        ) : shown.length === 0 ? (
          <Panel>
            <div className="text-center py-6">
              {showingIgnored ? <BellOff className="w-8 h-8 text-text-muted mx-auto" /> : <MessageCircle className="w-8 h-8 text-text-muted mx-auto" />}
              <p className="text-sm text-text-secondary mt-3">
                {showingIgnored
                  ? "Nenhuma conversa ignorada. Mensagem em massa de número novo (encaminhada, só figurinha, vídeo…) cai aqui sozinha; você também pode tocar em Ignorar dentro de uma conversa."
                  : clients.length === 0
                    ? "Nenhuma conversa ainda. Quando alguém escrever para o número da Margot, aparece aqui."
                    : "Nada neste filtro."}
              </p>
            </div>
          </Panel>
        ) : canDrag ? (
          <ul className="bg-bg-card border border-border-subtle rounded-lg overflow-hidden">
            {ownerRow && <ConversationRow c={{ ...ownerRow, name: "Você (modo secretária)", clientName: null }} {...actions} />}
            {pinned.length > 0 && <SectionLabel>Fixadas</SectionLabel>}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => lockSelection(true)} onDragEnd={onDragEnd} onDragCancel={() => lockSelection(false)}>
              <SortableContext items={pinned.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {pinned.map((c) => (
                  <SortableRow key={c.id} c={c} {...actions} />
                ))}
              </SortableContext>
            </DndContext>
            {pinned.length > 0 && others.length > 0 && <SectionLabel>Outras conversas</SectionLabel>}
            {others.map((c) => (
              <ConversationRow key={c.id} c={c} {...actions} />
            ))}
          </ul>
        ) : (
          <ul className="bg-bg-card border border-border-subtle rounded-lg overflow-hidden">
            {shown.map((c) => (
              <ConversationRow key={c.id} c={c} {...actions} noActions={showingIgnored} />
            ))}
          </ul>
        )}
      </main>

      {undo && (
        <div
          role="status"
          className="fixed z-40 inset-x-4 bottom-24 sm:bottom-6 mx-auto max-w-sm flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-elevated px-4 py-3 shadow-lg"
        >
          <span className="min-w-0 flex-1 truncate text-sm text-text-primary">Ignorada: {undo.title}</span>
          <button
            type="button"
            onClick={() => {
              const { id } = undo;
              setUndo(null);
              void patch(id, "reativar");
            }}
            className="shrink-0 min-h-11 px-3 text-sm font-medium text-gold cursor-pointer"
          >
            Desfazer
          </button>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <li role="presentation" className="px-4 py-1.5 text-xs text-text-muted bg-bg-secondary border-y border-border-subtle first:border-t-0">
      {children}
    </li>
  );
}

/** Linha das fixadas: o ícone ≡ arrasta, o resto da linha continua abrindo a conversa. */
function SortableRow(props: RowActions & { c: ConversationSummary }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props.c.id });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, position: "relative" };
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Arrastar para mudar a ordem"
      className="touch-none shrink-0 w-7 flex items-center justify-center self-stretch text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="w-4 h-4" aria-hidden="true" />
    </button>
  );
  return <ConversationRow {...props} liRef={setNodeRef} liStyle={style} dragging={isDragging} handle={handle} />;
}

interface RowActions {
  onTogglePin: (c: ConversationSummary) => void;
  onIgnore: (c: ConversationSummary) => void;
  /** Aba "Ignoradas": sem os botões de fixar e ignorar. */
  noActions?: boolean;
}

function ConversationRow({
  c,
  onTogglePin,
  onIgnore,
  noActions,
  handle,
  liRef,
  liStyle,
  dragging,
}: RowActions & {
  c: ConversationSummary;
  handle?: ReactNode;
  liRef?: (el: HTMLLIElement | null) => void;
  liStyle?: CSSProperties;
  dragging?: boolean;
}) {
  const title = c.clientName || c.name || c.phone;
  const letters = initials(title);
  const l = c.last;
  const unread = c.unread > 0;
  const color = tom({ isOwner: c.isOwner, hasOrder: c.order !== null, waiting: isWaiting(c), onlyNotice: c.onlyNotice, paused: c.paused });
  const showChips = c.order || c.paused || c.waiting || c.ignored || c.blocked || c.isOwner;
  return (
    <li
      ref={liRef}
      style={liStyle}
      className={`relative flex items-stretch border-l-4 after:pointer-events-none after:absolute after:bottom-0 after:left-[76px] after:right-0 after:h-px after:bg-border-subtle last:after:hidden ${TOM_FAIXA[color]} ${dragging ? "bg-bg-elevated shadow-lg" : isWaiting(c) && !c.ignored ? "bg-info/[0.04]" : ""}`}
    >
      {handle}
      <Link href={`/admin/conversas/${c.id}`} className={`flex min-w-0 flex-1 items-center gap-3 ${handle ? "pl-1" : "pl-3"} hover:bg-bg-elevated transition-colors`}>
        <span aria-hidden="true" className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-lg font-medium ${TOM_FOTO[color]}`}>
          {letters || <User className="w-6 h-6" />}
        </span>
        {/* O traço entre as conversas (after: da linha) começa depois da foto, como no WhatsApp. */}
        <span className="min-w-0 flex-1 py-3 pr-2">
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
          {showChips && (
            <span className="flex flex-wrap gap-1.5 mt-1.5">
              {c.isOwner && (
                <span className="text-[11px] border border-border-gold bg-gold/10 text-gold-light rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                  <Pin className="w-3 h-3" aria-hidden="true" /> Sempre no topo
                </span>
              )}
              {c.ignored && (
                <span className="text-[11px] border border-border-subtle text-text-secondary rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                  <BellOff className="w-3 h-3" aria-hidden="true" /> {ignoreLabel(c.ignoredReason)}
                </span>
              )}
              {c.blocked && (
                <span className="text-[11px] border border-bad/40 bg-bad/10 text-bad rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                  <Ban className="w-3 h-3" aria-hidden="true" /> Bloqueada no WhatsApp
                </span>
              )}
              {c.order && !c.isOwner && (
                <span className="text-[11px] border border-border-gold bg-gold/10 text-gold-light rounded-full px-2 py-0.5">
                  #{c.order.id} · {c.order.statusLabel}
                  {c.order.eventDate ? ` · ${formatDateBR(c.order.eventDate)}` : ""}
                </span>
              )}
              {c.paused && !c.ignored && !c.isOwner && (
                <span className="text-[11px] border border-warn/40 bg-warn/10 text-warn rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                  <PauseCircle className="w-3 h-3" aria-hidden="true" /> Margot pausada
                </span>
              )}
              {isWaiting(c) && !c.paused && !c.ignored && !c.isOwner && (
                <span className="text-[11px] border border-info/40 bg-info/10 text-info rounded-full px-2 py-0.5">Esperando resposta</span>
              )}
              {c.onlyNotice && !c.ignored && !c.isOwner && (
                <span className="text-[11px] border border-border-subtle bg-bg-elevated text-text-muted rounded-full px-2 py-0.5">Só aviso do WhatsApp</span>
              )}
            </span>
          )}
        </span>
      </Link>
      {!c.isOwner && !noActions && (
        <span className="shrink-0 flex flex-col justify-center">
          <button
            type="button"
            onClick={() => onTogglePin(c)}
            aria-label={c.pinned ? `Soltar ${title} da lista de fixadas` : `Fixar ${title} no topo`}
            title={c.pinned ? "Soltar" : "Fixar no topo"}
            className={`w-11 h-11 flex items-center justify-center cursor-pointer ${c.pinned ? "text-gold" : "text-text-muted hover:text-text-primary"}`}
          >
            {c.pinned ? <PinOff className="w-[18px] h-[18px]" aria-hidden="true" /> : <Pin className="w-[18px] h-[18px]" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => onIgnore(c)}
            aria-label={`Ignorar ${title}`}
            title="Ignorar conversa"
            className="w-11 h-11 flex items-center justify-center text-text-muted hover:text-text-primary cursor-pointer"
          >
            <BellOff className="w-[18px] h-[18px]" aria-hidden="true" />
          </button>
        </span>
      )}
    </li>
  );
}
