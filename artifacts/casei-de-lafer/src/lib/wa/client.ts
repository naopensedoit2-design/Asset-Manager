// Cliente da API oficial do WhatsApp (Cloud API da Meta), via fetch, sem SDK.
// Documentação: developers.facebook.com/documentation/business-messaging/whatsapp

import { waConfig } from "./config";

export class WaApiError extends Error {
  code: number;
  httpStatus: number;
  constructor(message: string, code: number, httpStatus: number) {
    super(message);
    this.name = "WaApiError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
  /** A janela de 24h fechou: só modelo (template) aprovado pode ser enviado. */
  get windowClosed() {
    return this.code === 131047;
  }
}

/** Erros que a Meta devolve, em português, para o painel. */
export function explainError(e: unknown): string {
  if (!(e instanceof WaApiError)) return e instanceof Error ? e.message : String(e);
  const known: Record<number, string> = {
    131047: "A janela de 24 horas desta conversa fechou. O WhatsApp só deixa enviar mensagens modelo até a pessoa escrever de novo.",
    131026: "Não deu para entregar: o número pode não ter WhatsApp ou estar com o aplicativo desatualizado.",
    131042: "Falta a forma de pagamento na conta do WhatsApp (Meta). Cadastre um cartão no Gerenciador do WhatsApp.",
    130429: "Muitas mensagens em pouco tempo. Tente de novo em instantes.",
    131056: "Muitas mensagens para a mesma pessoa em pouco tempo. Tente de novo em instantes.",
    132000: "O modelo de mensagem tem outra quantidade de campos. Confira o modelo na Meta.",
    132001: "O modelo de mensagem não existe ou ainda não foi aprovado pela Meta.",
    133010: "O número da Margot ainda não foi registrado na API. Use o botão Registrar número em Regras.",
    190: "O token do WhatsApp expirou ou é inválido. Gere um token permanente (usuário do sistema) e atualize na Vercel.",
  };
  return known[e.code] ?? `WhatsApp recusou (código ${e.code}): ${e.message}`;
}

function url(path: string) {
  const c = waConfig();
  return `${c.apiBase}/${c.graphVersion}/${path.replace(/^\//, "")}`;
}

async function graph<T = any>(path: string, init: { method?: string; json?: unknown; form?: FormData } = {}): Promise<T> {
  const c = waConfig();
  if (!c.token) throw new WaApiError("WHATSAPP_TOKEN não configurado", 0, 0);
  const res = await fetch(url(path), {
    method: init.method ?? (init.json || init.form ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${c.token}`,
      ...(init.json ? { "Content-Type": "application/json" } : {}),
    },
    body: init.json ? JSON.stringify(init.json) : init.form,
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || body?.error) {
    const err = body?.error ?? {};
    const detail = err.error_data?.details ? ` (${err.error_data.details})` : "";
    throw new WaApiError(`${err.message ?? `HTTP ${res.status}`}${detail}`, Number(err.code) || 0, res.status);
  }
  return body as T;
}

// ─── Montagem das mensagens ──────────────────────────────────

export type OutMessage = Record<string, unknown> & { type: string };

export const textMessage = (body: string, previewUrl = true): OutMessage => ({
  type: "text",
  text: { body, preview_url: previewUrl },
});

export const templateMessage = (name: string, lang: string, params: string[]): OutMessage => ({
  type: "template",
  template: {
    name,
    language: { code: lang },
    components: params.length ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] : [],
  },
});

export type Header =
  | { type: "text"; text: string }
  | { type: "image"; image: { id: string } }
  | { type: "document"; document: { id: string; filename?: string } };

/** Mensagem com até 3 botões de resposta (título de até 20 caracteres, id de até 256). */
export const buttonsMessage = (body: string, buttons: { id: string; title: string }[], header?: Header, footer?: string): OutMessage => ({
  type: "interactive",
  interactive: {
    type: "button",
    ...(header ? { header } : {}),
    body: { text: body.slice(0, 1024) },
    ...(footer ? { footer: { text: footer.slice(0, 60) } } : {}),
    action: { buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) } })) },
  },
});

/** Mensagem com um botão que abre um link. */
export const linkButtonMessage = (body: string, label: string, link: string): OutMessage => ({
  type: "interactive",
  interactive: {
    type: "cta_url",
    body: { text: body.slice(0, 1024) },
    action: { name: "cta_url", parameters: { display_text: label.slice(0, 20), url: link } },
  },
});

export const audioMessage = (mediaId: string, voice = true): OutMessage => ({ type: "audio", audio: { id: mediaId, voice } });
export const imageMessage = (mediaId: string, caption = ""): OutMessage => ({
  type: "image",
  image: { id: mediaId, ...(caption ? { caption: caption.slice(0, 1024) } : {}) },
});
export const documentMessage = (mediaId: string, filename: string, caption = ""): OutMessage => ({
  type: "document",
  document: { id: mediaId, filename, ...(caption ? { caption: caption.slice(0, 1024) } : {}) },
});

// ─── Chamadas ────────────────────────────────────────────────

/** Envia e devolve o id da mensagem (wamid). */
export async function send(to: string, message: OutMessage): Promise<string> {
  const c = waConfig();
  const r = await graph<{ messages?: { id: string }[] }>(`${c.phoneNumberId}/messages`, {
    json: { messaging_product: "whatsapp", recipient_type: "individual", to, ...message },
  });
  return r.messages?.[0]?.id ?? "";
}

/** Marca como lida (dois tiques azuis) e, se pedir, mostra "digitando…" por até ~25 segundos. */
export async function markRead(wamid: string, typing = false): Promise<void> {
  const c = waConfig();
  await graph(`${c.phoneNumberId}/messages`, {
    json: {
      messaging_product: "whatsapp",
      status: "read",
      message_id: wamid,
      ...(typing ? { typing_indicator: { type: "text" } } : {}),
    },
  });
}

export async function uploadMedia(data: Buffer, mime: string, filename: string): Promise<string> {
  const c = waConfig();
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mime);
  form.append("file", new Blob([new Uint8Array(data)], { type: mime }), filename);
  const r = await graph<{ id: string }>(`${c.phoneNumberId}/media`, { form });
  return r.id;
}

/** Baixa uma mídia recebida (imagem, áudio, documento). Fica disponível na Meta por cerca de 30 dias. */
export async function downloadMedia(mediaId: string): Promise<{ data: Buffer; mime: string; size: number }> {
  const c = waConfig();
  const info = await graph<{ url: string; mime_type: string; file_size?: number }>(encodeURIComponent(mediaId));
  // O link vem do servidor da Meta; em testes locais, WHATSAPP_API_BASE aponta para o simulador.
  const res = await fetch(info.url, {
    headers: { Authorization: `Bearer ${c.token}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new WaApiError(`Falha ao baixar mídia (HTTP ${res.status})`, 131052, res.status);
  const data = Buffer.from(await res.arrayBuffer());
  return { data, mime: info.mime_type || res.headers.get("content-type") || "application/octet-stream", size: data.length };
}

export interface PhoneInfo {
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
  name_status?: string;
  status?: string;
  platform_type?: string;
}

export async function phoneInfo(): Promise<PhoneInfo> {
  const c = waConfig();
  return graph<PhoneInfo>(
    `${c.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,name_status,status,platform_type`,
  );
}

/** Registra o número na Cloud API (necessário uma vez, com um PIN de 6 dígitos que vira a confirmação em duas etapas). */
export async function registerNumber(pin: string): Promise<void> {
  const c = waConfig();
  await graph(`${c.phoneNumberId}/register`, { json: { messaging_product: "whatsapp", pin } });
}

/** Faz o app receber os webhooks da conta do WhatsApp (WABA). */
export async function subscribeApp(): Promise<void> {
  const c = waConfig();
  if (!c.wabaId) throw new WaApiError("Defina WHATSAPP_WABA_ID na Vercel para usar este botão.", 0, 0);
  await graph(`${c.wabaId}/subscribed_apps`, { method: "POST" });
}
