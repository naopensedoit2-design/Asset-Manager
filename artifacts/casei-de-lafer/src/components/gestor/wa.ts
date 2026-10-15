// Tipos e utilidades compartilhados pelas telas de Conversas (WhatsApp da Margot).

export interface ConversationSummary {
  id: number;
  name: string;
  clientName: string | null;
  phone: string;
  waId: string;
  isOwner: boolean;
  paused: boolean;
  pausedUntil: string | null;
  windowOpen: boolean;
  unread: number;
  lastMessageAt: string | null;
  waiting: boolean;
  order: { id: number; status: string; statusLabel: string; eventDate: string | null } | null;
  last: { direction: string; author: string; type: string; text: string; status: string; at: string } | null;
}

const TZ = "America/Sao_Paulo";

export function whenLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const day = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(x);
  const today = day(new Date());
  const yesterday = day(new Date(Date.now() - 86_400_000));
  if (day(d) === today) return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  if (day(d) === yesterday) return "ontem";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(d);
}

export interface Status {
  configurado: boolean;
  faltando: string[];
  dono: string | null;
}
