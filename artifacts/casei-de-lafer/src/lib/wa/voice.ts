// Áudio: transcrição dos áudios recebidos e resposta em voz para o Leonardo.
// A API do Claude não ouve nem fala, então usamos uma API compatível com a da OpenAI
// (OpenAI por padrão). Sem VOICE_API_KEY, tudo continua funcionando só com texto.

function cfg() {
  const env = (k: string) => (process.env[k] ?? "").trim();
  return {
    key: env("VOICE_API_KEY"),
    base: (env("VOICE_API_BASE") || "https://api.openai.com/v1").replace(/\/$/, ""),
    transcribeModel: env("TRANSCRIBE_MODEL") || "gpt-4o-mini-transcribe",
    ttsModel: env("TTS_MODEL") || "gpt-4o-mini-tts",
    ttsVoice: env("TTS_VOICE") || "coral",
  };
}

export const voiceReady = () => Boolean(cfg().key);

/** Áudio → texto (português). */
export async function transcribe(data: Buffer, mime: string): Promise<string> {
  const c = cfg();
  if (!c.key) throw new Error("VOICE_API_KEY não configurada");
  const ext = mime.includes("ogg") ? "ogg" : mime.includes("mpeg") ? "mp3" : mime.includes("mp4") || mime.includes("m4a") ? "m4a" : mime.includes("aac") ? "aac" : mime.includes("amr") ? "amr" : "ogg";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(data)], { type: mime.split(";")[0] || "audio/ogg" }), `audio.${ext}`);
  form.append("model", c.transcribeModel);
  form.append("language", "pt");
  form.append("response_format", "json");
  const res = await fetch(`${c.base}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.key}` },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Transcrição falhou (HTTP ${res.status}): ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
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
