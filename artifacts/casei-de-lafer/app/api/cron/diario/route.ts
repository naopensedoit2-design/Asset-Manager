import { ok, cronRoute } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";
import { sendDailySummary } from "@/lib/wa/summary";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = cronRoute(async () => {
  const rotina = await gestor.runDailyRoutine();
  // O resumo no WhatsApp nunca derruba a rotina principal.
  const whatsapp = await sendDailySummary().catch((e) => {
    console.error("[cron] resumo no WhatsApp", e);
    return { enviado: false, motivo: (e as Error).message };
  });
  return ok({ ...rotina, whatsapp });
});
