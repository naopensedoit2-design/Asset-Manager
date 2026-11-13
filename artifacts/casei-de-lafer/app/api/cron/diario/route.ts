import { ok, cronRoute } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";
import { sendDailySummary } from "@/lib/wa/summary";
import { recordRoutine } from "@/lib/admin/hoje-service";
import { apagarConversasAntigas } from "@/lib/margot/site-conversas-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = cronRoute(async () => {
  const rotina = await gestor.runDailyRoutine();
  // O resumo no WhatsApp nunca derruba a rotina principal.
  const whatsapp = await sendDailySummary().catch((e) => {
    console.error("[cron] resumo no WhatsApp", e);
    return { enviado: false, motivo: (e as Error).message };
  });
  // Conversas do chat do site com mais de 6 meses são apagadas (política de privacidade). Nunca derruba a rotina.
  const conversasApagadas = await apagarConversasAntigas().catch((e) => {
    console.error("[cron] apagar conversas antigas do site", e);
    return null;
  });
  // Anota que rodou (aparece em Conexões). Também nunca derruba a rotina.
  await recordRoutine(whatsapp).catch((e) => console.error("[cron] registro da execução", e));
  return ok({ ...rotina, whatsapp, conversasApagadas });
});
