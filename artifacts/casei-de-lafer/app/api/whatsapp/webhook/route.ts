// Webhook do WhatsApp (API oficial da Meta). Configure na Meta:
//   URL de callback: https://<seu-site>/api/whatsapp/webhook
//   Token de verificação: o mesmo valor de WHATSAPP_VERIFY_TOKEN
//   Campo assinado: messages
// Passo a passo em docs/whatsapp.md.

import { after, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { waConfig } from "@/lib/wa/config";
import { ingest, processContact } from "@/lib/wa/process";
import { rescueUnanswered, sendFollowUps } from "@/lib/wa/lembrete-service";
import { isValidSignature } from "@/lib/wa/signature";

export const dynamic = "force-dynamic";
// A resposta para a Meta sai na hora; a Margot responde em seguida, dentro deste limite.
// Áudio (transcrição) + espera + várias rodadas da IA com ferramentas passavam de 60 s e a resposta morria no meio.
export const maxDuration = 300;

/** Verificação feita pela Meta ao salvar a URL do webhook. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const expected = waConfig().verifyToken;
  if (p.get("hub.mode") === "subscribe" && expected && p.get("hub.verify_token") === expected) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Token de verificação inválido", { status: 403 });
}

export async function POST(req: NextRequest) {
  const { appSecret } = waConfig();
  if (!appSecret) return new Response("WhatsApp não configurado", { status: 503 });

  const raw = Buffer.from(await req.arrayBuffer());
  if (!isValidSignature(raw, req.headers.get("x-hub-signature-256"), appSecret)) {
    return new Response("Assinatura inválida", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  // Se o banco falhar aqui, devolve erro e a Meta tenta de novo mais tarde.
  const jobs = await ingest(payload);
  await prisma.setting
    .upsert({
      where: { key: "whatsappUltimoWebhook" },
      create: { key: "whatsappUltimoWebhook", value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    })
    .catch(() => {});

  after(async () => {
    if (jobs.length) {
      await Promise.all(jobs.map((job) => processContact(job).catch((e) => console.error("[whatsapp] processamento", e))));
    }
    // Mensagem que ficou sem resposta por falha: uma nova tentativa (no máximo uma rodada a cada 2 min).
    await rescueUnanswered().catch((e) => console.error("[whatsapp] resgate", e));
    // Lembrete para lead parado: aproveita o webhook (no máximo uma rodada a cada 10 min).
    await sendFollowUps().catch((e) => console.error("[whatsapp] lembretes", e));
  });
  return new Response("ok", { status: 200 });
}
