import { ok, cronRoute } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";
import { sendDailySummary } from "@/lib/wa/summary";
import { recordRoutine, recordRoutineReject } from "@/lib/admin/hoje-service";
import { apagarConversasAntigas } from "@/lib/margot/site-conversas-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = cronRoute(async () => {
  console.log("[cron] rotina diária começou");
  // Se a parte principal falhar, o motivo fica gravado (Conexões, a Margot e ?rotina=1 mostram):
  // a Vercel do plano grátis guarda só 1 h de log e, antes, uma falha aqui não deixava rastro nenhum.
  let rotina: Awaited<ReturnType<typeof gestor.runDailyRoutine>>;
  try {
    rotina = await gestor.runDailyRoutine();
  } catch (e) {
    await recordRoutine({ enviado: false, motivo: `a rotina falhou antes do resumo: ${((e as Error).message || "erro").slice(0, 200)}` }).catch(() => {});
    throw e;
  }
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
}, (motivo) => recordRoutineReject(motivo));
