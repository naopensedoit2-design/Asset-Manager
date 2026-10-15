// Lê o webhook da API oficial do WhatsApp (Cloud API) e devolve mensagens e status num formato simples.
// Puro: testado em wa.test.ts. Nada aqui confia no conteúdo: tudo é convertido para string/número.

export interface InboundMessage {
  wamid: string;
  from: string; // wa_id de quem mandou (só dígitos)
  profileName: string;
  phoneNumberId: string; // número da empresa que recebeu
  timestamp: number; // em milissegundos
  type: string; // text | image | audio | document | video | sticker | location | contacts | interactive | button | reaction | ...
  text: string; // texto, legenda, título do botão ou descrição legível
  mediaId: string;
  mediaMime: string;
  fileName: string;
  isVoice: boolean; // áudio gravado na hora (nota de voz)
  buttonId: string; // id do botão tocado (interactive/button)
  replyTo: string; // wamid da mensagem citada, se houver
  reactionTo: string; // wamid da mensagem que recebeu a reação
}

export interface StatusUpdate {
  wamid: string;
  status: string; // sent | delivered | read | failed
  recipient: string;
  phoneNumberId: string;
  timestamp: number;
  errorCode: number | null;
  errorTitle: string;
}

export interface ParsedWebhook {
  messages: InboundMessage[];
  statuses: StatusUpdate[];
}

const s = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const obj = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {});
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

const MEDIA_TYPES = ["image", "audio", "video", "document", "sticker"];

function readable(type: string, m: Record<string, any>): { text: string; buttonId: string } {
  switch (type) {
    case "text":
      return { text: s(obj(m.text).body), buttonId: "" };
    case "image":
    case "video":
    case "document":
    case "audio":
    case "sticker":
      return { text: s(obj(m[type]).caption), buttonId: "" };
    case "location": {
      const l = obj(m.location);
      const place = [s(l.name), s(l.address)].filter(Boolean).join(", ");
      const coords = l.latitude !== undefined ? `${s(l.latitude)}, ${s(l.longitude)}` : "";
      return { text: [place, coords && `(${coords})`].filter(Boolean).join(" "), buttonId: "" };
    }
    case "contacts": {
      const list = arr(m.contacts).map((c) => {
        const name = s(obj(c.name).formatted_name);
        const phones = arr(c.phones).map((p) => s(obj(p).phone)).filter(Boolean);
        return [name, phones.join(", ")].filter(Boolean).join(": ");
      });
      return { text: list.join("; "), buttonId: "" };
    }
    case "interactive": {
      const i = obj(m.interactive);
      const reply = obj(i.button_reply ?? i.list_reply);
      if (reply.id !== undefined || reply.title !== undefined) {
        return { text: [s(reply.title), s(reply.description)].filter(Boolean).join(" — "), buttonId: s(reply.id) };
      }
      const flow = obj(i.nfm_reply);
      return { text: s(flow.body) || s(flow.response_json), buttonId: "" };
    }
    case "button": // botão de resposta rápida de um modelo (template)
      return { text: s(obj(m.button).text), buttonId: s(obj(m.button).payload) };
    case "reaction":
      return { text: s(obj(m.reaction).emoji), buttonId: "" };
    default:
      return { text: s(obj(arr(m.errors)[0]).title), buttonId: "" };
  }
}

export function parseWebhook(body: unknown): ParsedWebhook {
  const out: ParsedWebhook = { messages: [], statuses: [] };
  const root = obj(body);
  if (root.object !== "whatsapp_business_account") return out;

  for (const entry of arr(root.entry)) {
    for (const change of arr(obj(entry).changes)) {
      const c = obj(change);
      if (c.field !== "messages") continue;
      const value = obj(c.value);
      const phoneNumberId = s(obj(value.metadata).phone_number_id);
      const names = new Map<string, string>();
      for (const contact of arr(value.contacts)) {
        const ct = obj(contact);
        names.set(s(ct.wa_id), s(obj(ct.profile).name));
      }

      for (const raw of arr(value.messages)) {
        const m = obj(raw);
        const type = s(m.type) || "unknown";
        const from = s(m.from).replace(/\D/g, "");
        const wamid = s(m.id);
        if (!from || !wamid) continue;
        const media = MEDIA_TYPES.includes(type) ? obj(m[type]) : {};
        const { text, buttonId } = readable(type, m);
        out.messages.push({
          wamid,
          from,
          profileName: names.get(s(m.from)) ?? names.get(from) ?? "",
          phoneNumberId,
          timestamp: Number(s(m.timestamp)) * 1000 || 0,
          type,
          text,
          mediaId: s(media.id),
          mediaMime: s(media.mime_type),
          fileName: s(media.filename),
          isVoice: type === "audio" && media.voice === true,
          buttonId,
          replyTo: s(obj(m.context).id),
          reactionTo: type === "reaction" ? s(obj(m.reaction).message_id) : "",
        });
      }

      for (const raw of arr(value.statuses)) {
        const st = obj(raw);
        const err = obj(arr(st.errors)[0]);
        if (!s(st.id)) continue;
        out.statuses.push({
          wamid: s(st.id),
          status: s(st.status),
          recipient: s(st.recipient_id),
          phoneNumberId,
          timestamp: Number(s(st.timestamp)) * 1000 || 0,
          errorCode: typeof err.code === "number" ? err.code : null,
          errorTitle: s(err.title) || s(err.message),
        });
      }
    }
  }
  return out;
}
