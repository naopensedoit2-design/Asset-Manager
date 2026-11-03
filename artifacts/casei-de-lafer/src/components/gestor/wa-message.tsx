"use client";

// Uma mensagem da conversa do painel, com a cara do WhatsApp: balão com rabinho, hora e tiques dentro dele,
// foto, vídeo, áudio, documento, localização, contato, reação e avisos. Os desenhos vêm de app/admin/whatsapp.css
// e as cores dos tokens --wa-* de app/admin/theme.css (nada de cor fixa aqui: o painel tem 4 temas).

import { useState } from "react";
import { AlertTriangle, Check, CheckCheck, Clock, Download, FileText, Forward, MapPin, Play, User } from "lucide-react";
import { mapsUrl, noticeText, parseContacts, parseLocation, telUrl, TZ, viewKind } from "@/lib/wa/view";

export interface ChatMessage {
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

const timeOf = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const AUTHOR: Record<string, string> = { margot: "Margot", leonardo: "Você", sistema: "Automático", cliente: "" };
const AUTHOR_COLOR: Record<string, string> = { margot: "text-wa-lbl-margot", leonardo: "text-wa-lbl-voce", sistema: "text-wa-lbl-auto" };

export function Ticks({ status }: { status: string }) {
  const size = "w-[17px] h-[17px]";
  if (status === "lida") return <CheckCheck className={`${size} text-wa-tick-read`} aria-label="lida" />;
  if (status === "entregue") return <CheckCheck className={size} aria-label="entregue" />;
  if (status === "enviada") return <Check className={size} aria-label="enviada" />;
  if (status === "pendente") return <Clock className="w-3 h-3" aria-label="na fila" />;
  if (status === "falhou") return <AlertTriangle className="w-3.5 h-3.5 text-wa-err" aria-label="falhou" />;
  return null;
}

/** Texto com a formatação do WhatsApp (*negrito*, _itálico_, ~riscado~) e links clicáveis. */
export function WaText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^https?:\/\//.test(p)) {
          return (
            <a key={i} href={p} target="_blank" rel="noreferrer" className="underline underline-offset-2 text-wa-link break-all">
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

// ─── Mídia ───────────────────────────────────────────────────

const mediaUrl = (id: string) => `/api/admin/whatsapp/midia/${encodeURIComponent(id)}`;
/** Mesmo arquivo, mas para salvar em vez de abrir (o servidor responde com "attachment"). */
const downloadUrl = (src: string) => `${src}?baixar=1`;

/** Quando o arquivo não abre (a Meta guarda por cerca de 30 dias, ou o celular não toca aquele formato). */
function Unavailable({ children, src }: { children: React.ReactNode; src?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-wa-sub px-3 py-2 text-sm min-w-48">
      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{children}</span>
      {src && (
        <a href={downloadUrl(src)} download className="underline underline-offset-2 text-wa-link shrink-0">
          Baixar
        </a>
      )}
    </div>
  );
}

function Photo({ src, alt, sticker, onLoad }: { src: string; alt: string; sticker: boolean; onLoad?: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Unavailable>{sticker ? "Figurinha indisponível." : "Foto indisponível."}</Unavailable>;
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={onLoad}
        onError={() => setFailed(true)}
        className={sticker ? "w-36 h-36 object-contain" : "rounded-md max-h-80 w-auto max-w-full min-h-24 min-w-40 bg-wa-sub"}
      />
    </a>
  );
}

/** Vídeo só carrega quando a pessoa toca: uma conversa com vários vídeos não baixa tudo ao abrir. */
function Video({ src, onLoad }: { src: string; onLoad?: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return <Unavailable src={src}>Não consegui tocar este vídeo aqui.</Unavailable>;
  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label="Tocar vídeo"
        className="relative grid place-items-center w-64 max-w-full aspect-video rounded-md bg-wa-sub cursor-pointer"
      >
        <span className="w-12 h-12 rounded-full grid place-items-center bg-wa-overlay text-wa-overlay-text">
          <Play className="w-6 h-6 ml-0.5" aria-hidden="true" />
        </span>
      </button>
    );
  }
  return (
    <video
      src={src}
      controls
      autoPlay
      playsInline
      onLoadedMetadata={onLoad}
      onError={() => setFailed(true)}
      className="rounded-md max-h-80 max-w-full bg-wa-sub"
    />
  );
}

function Audio({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Unavailable src={src}>Não consegui tocar este áudio aqui.</Unavailable>;
  return <audio controls preload="none" src={src} onError={() => setFailed(true)} className="w-64 max-w-full h-10" />;
}

function DocumentCard({ src, name, mime }: { src: string; name: string; mime: string }) {
  const pdf = mime.includes("pdf");
  const ext = pdf ? "PDF" : (name.split(".").pop() ?? "").slice(0, 5).toUpperCase();
  // PDF abre no leitor do navegador; qualquer outro tipo é salvo (o servidor nunca abre arquivo de desconhecido como página).
  const link = pdf ? { href: src, target: "_blank", rel: "noreferrer" } : { href: downloadUrl(src), download: true };
  return (
    <a {...link} className="flex items-center gap-3 rounded-md bg-wa-sub px-3 py-2.5 min-w-52 max-w-full">
      <FileText className="w-7 h-7 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px]">{name || "Documento"}</span>
        {ext && <span className="block text-xs text-wa-time">{ext}</span>}
      </span>
      <Download className="w-5 h-5 shrink-0" aria-label="Abrir" />
    </a>
  );
}

function LocationCard({ text }: { text: string }) {
  const place = parseLocation(text);
  if (!place) return <p className="wa-text">{text || "Localização"}</p>;
  return (
    <a href={mapsUrl(place.lat, place.lng)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-md bg-wa-sub px-3 py-2.5 min-w-52 max-w-full">
      <MapPin className="w-7 h-7 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] break-words">{place.label || "Localização"}</span>
        <span className="block text-xs text-wa-link underline underline-offset-2">Abrir no mapa</span>
      </span>
    </a>
  );
}

function ContactsCard({ text }: { text: string }) {
  const list = parseContacts(text);
  if (!list.length) return <p className="wa-text">Contato</p>;
  return (
    <div className="space-y-1.5">
      {list.map((c, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md bg-wa-sub px-3 py-2.5 min-w-52 max-w-full">
          <User className="w-7 h-7 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] break-words">{c.name || "Contato"}</span>
            {c.phones.map((p) => (
              <a key={p} href={telUrl(p)} className="block text-xs text-wa-link underline underline-offset-2">
                {p}
              </a>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Balão ───────────────────────────────────────────────────

/** Aviso no meio da conversa (reação, mensagem que o WhatsApp não entrega, conversa pausada…). */
export function NoticePill({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center my-2">
      <p className="max-w-[88%] rounded-lg bg-wa-notice px-3 py-1.5 text-center text-[13px] leading-[18px] text-wa-notice-text shadow-[0_1px_0.5px_var(--wa-shadow)]">
        {children}
      </p>
    </div>
  );
}

export function Bubble({
  m,
  ownerChat,
  who,
  first,
  onMediaLoad,
}: {
  m: ChatMessage;
  /** Conversa do próprio Leonardo com a Margot (modo secretária): o que ele escreve é "Você". */
  ownerChat: boolean;
  /** Nome de quem escreve (para dizer quem reagiu). */
  who: string;
  /** Primeiro balão de uma sequência do mesmo lado: ganha o rabinho. */
  first: boolean;
  onMediaLoad?: () => void;
}) {
  const kind = viewKind(m);
  if (kind === "reaction") return <NoticePill>{`${m.direction === "in" && !ownerChat ? who || "A pessoa" : "Você"} reagiu com ${m.text || "👍"}`}</NoticePill>;
  if (kind === "notice") return <NoticePill>{noticeText(m.type, m.text)}</NoticePill>;

  const mine = m.direction === "out";
  const label = mine ? (AUTHOR[m.author] ?? m.author) : ownerChat ? "Você" : "";
  const labelColor = mine ? (AUTHOR_COLOR[m.author] ?? "text-wa-lbl-auto") : "text-wa-lbl-voce";
  const src = m.mediaId ? mediaUrl(m.mediaId) : "";

  const text =
    m.type === "template" ? `Aviso modelo: ${m.text}` : m.type === "audio" && m.text && !mine ? `🎤 “${m.text}”` : m.text;
  // Localização e contato mostram o texto dentro do cartão, não de novo embaixo.
  const showText = Boolean(text.trim()) && kind !== "location" && kind !== "contacts";
  const photoLike = kind === "image" || kind === "video" || kind === "sticker";
  const overlay = photoLike && !showText && m.status !== "falhou";

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} ${first ? "mt-2" : "mt-0.5"}`}>
      <div
        className="wa-bubble"
        data-dir={mine ? "out" : "in"}
        data-tail={first && kind !== "sticker" ? "true" : "false"}
        data-bare={kind === "sticker" ? "true" : "false"}
        data-media={photoLike && kind !== "sticker" ? "true" : "false"}
        data-overlay={overlay ? "true" : "false"}
        data-failed={m.status === "falhou" ? "true" : "false"}
      >
        {label && (
          <p className={`text-[12.5px] leading-4 font-semibold mb-0.5 ${photoLike ? "px-1.5 pt-0.5" : ""} ${labelColor}`}>{label}</p>
        )}
        {!mine && m.kind === "encaminhada" && (
          // A figurinha não tem fundo de balão: o aviso vai numa etiqueta, como o separador de dia.
          <p className={`mb-0.5 ${photoLike && kind !== "sticker" ? "px-1.5 pt-0.5" : ""}`}>
            <span
              className={
                kind === "sticker"
                  ? "inline-flex items-center gap-1 rounded-md bg-wa-pill px-1.5 py-0.5 text-[12px] italic text-wa-pill-text"
                  : "inline-flex items-center gap-1 text-[12.5px] leading-4 italic text-wa-time"
              }
            >
              <Forward className="w-3.5 h-3.5" aria-hidden="true" /> Encaminhada
            </span>
          </p>
        )}
        {kind === "image" && <Photo src={src} alt={m.text || "Foto"} sticker={false} onLoad={onMediaLoad} />}
        {kind === "sticker" && <Photo src={src} alt="Figurinha" sticker onLoad={onMediaLoad} />}
        {kind === "video" && <Video src={src} onLoad={onMediaLoad} />}
        {kind === "audio" && <Audio src={src} />}
        {kind === "document" && <DocumentCard src={src} name={m.fileName} mime={m.mediaMime} />}
        {kind === "location" && <LocationCard text={m.text} />}
        {kind === "contacts" && <ContactsCard text={m.text} />}
        {showText && (
          <p className={`wa-text ${photoLike || kind === "document" ? "px-1.5 pt-1" : ""} ${kind === "audio" ? "italic" : ""}`}>
            <WaText text={text} />
            <span className="wa-pad" aria-hidden="true" />
          </p>
        )}
        {m.type === "interactive" && mine && <p className="text-[11px] text-wa-time-out pr-16">com botões</p>}
        {m.status === "falhou" && m.error && <p className="text-xs text-wa-err mt-1 pr-16">{m.error}</p>}
        {m.status === "pendente" && <p className="text-xs text-wa-time-out mt-1 pr-16">Na fila: sai quando a conversa abrir.</p>}
        {!showText && !overlay && <div className="h-3.5" aria-hidden="true" />}
        <span className="wa-meta">
          {timeOf(m.createdAt)}
          {mine && <Ticks status={m.status} />}
        </span>
      </div>
    </div>
  );
}
