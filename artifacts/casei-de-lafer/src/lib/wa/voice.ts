// Áudio: transcrição dos áudios recebidos e resposta em voz para o Leonardo.
// A API do Claude não ouve nem fala, então usamos uma API compatível com a da OpenAI
// (OpenAI por padrão). Sem VOICE_API_KEY, tudo continua funcionando só com texto.
//
// Reserva para ouvir: se VOICE_FALLBACK_API_KEY existir (por padrão, a Groq, que tem plano grátis), a Margot tenta
// a reserva quando o provedor principal falha (acabou o crédito, limite, fora do ar). Só a transcrição tem reserva;
// a voz falada (síntese) usa apenas o provedor principal.

function env(k: string) {
  return (process.env[k] ?? "").trim();
}

function cfg() {
  return {
    key: env("VOICE_API_KEY"),
    base: (env("VOICE_API_BASE") || "https://api.openai.com/v1").replace(/\/$/, ""),
    transcribeModel: env("TRANSCRIBE_MODEL") || "gpt-4o-mini-transcribe",
    ttsModel: env("TTS_MODEL") || "gpt-4o-mini-tts",
    ttsVoice: env("TTS_VOICE") || "coral",
  };
}

interface Provider {
  name: "principal" | "reserva";
  key: string;
  base: string;
  model: string;
}

/** Provedores de transcrição, na ordem em que são tentados. */
export function transcriptionProviders(): Provider[] {
  const c = cfg();
  const list: Provider[] = [];
  if (c.key) list.push({ name: "principal", key: c.key, base: c.base, model: c.transcribeModel });
  const fallbackKey = env("VOICE_FALLBACK_API_KEY");
  if (fallbackKey) {
    list.push({
      name: "reserva",
      key: fallbackKey,
      base: (env("VOICE_FALLBACK_API_BASE") || "https://api.groq.com/openai/v1").replace(/\/$/, ""),
      model: env("VOICE_FALLBACK_TRANSCRIBE_MODEL") || "whisper-large-v3-turbo",
    });
  }
  return list;
}

/** A Margot consegue ouvir áudios (provedor principal ou reserva configurado). */
export const voiceReady = () => transcriptionProviders().length > 0;

/** A Margot consegue falar (síntese de voz): só com o provedor principal. */
export const speechReady = () => Boolean(cfg().key);

async function transcribeWith(p: Provider, data: Buffer, mime: string): Promise<string> {
  const ext = mime.includes("ogg") ? "ogg" : mime.includes("mpeg") ? "mp3" : mime.includes("mp4") || mime.includes("m4a") ? "m4a" : mime.includes("aac") ? "aac" : mime.includes("amr") ? "amr" : "ogg";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(data)], { type: mime.split(";")[0] || "audio/ogg" }), `audio.${ext}`);
  form.append("model", p.model);
  form.append("language", "pt");
  form.append("response_format", "json");
  const res = await fetch(`${p.base}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${p.key}` },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}

/** Áudio → texto (português). Tenta o provedor principal e, se falhar, a reserva. */
export async function transcribe(data: Buffer, mime: string): Promise<string> {
  const providers = transcriptionProviders();
  if (!providers.length) throw new Error("VOICE_API_KEY não configurada");
  const failures: string[] = [];
  for (const p of providers) {
    try {
      const text = await transcribeWith(p, data, mime);
      if (failures.length) console.warn(`[whatsapp] transcrição feita pela reserva (${failures.join(" | ")})`);
      return text;
    } catch (e) {
      failures.push(`${p.name}: ${(e as Error).message}`);
    }
  }
  throw new Error(`Transcrição falhou (${failures.join(" | ")})`);
}

/** Texto → áudio OGG/Opus, o formato da nota de voz do WhatsApp. */
export async function synthesize(text: string): Promise<Buffer> {
  const c = cfg();
  if (!c.key) throw new Error("VOICE_API_KEY não configurada");
  const res = await fetch(`${c.base}/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: c.ttsModel,
      voice: c.ttsVoice,
      input: text.slice(0, 3500),
      instructions:
        "Fale em português do Brasil, com sotaque brasileiro natural, tom caloroso, elegante e tranquilo, como uma secretária experiente. Leia valores em reais e datas por extenso.",
      response_format: "opus",
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Voz falhou (HTTP ${res.status}): ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Texto pensado para a leitura em voz: sem asteriscos, links e marcadores. */
export function speakable(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_~`]/g, "")
    .replace(/^•\s*/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
