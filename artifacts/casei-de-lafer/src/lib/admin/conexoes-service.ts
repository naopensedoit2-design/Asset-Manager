// Tela "Conexões": lê só a configuração (variáveis, banco), sem chamar Meta nem Google, para abrir rápido e
// nunca falhar por causa de um serviço de fora. A checagem ao vivo é um botão à parte (Conferir agora).
// Os nomes das variáveis que faltam aparecem; os valores nunca saem daqui.

import { prisma } from "@/lib/prisma";
import * as gestor from "@/lib/gestor/service";
import { calendarId, serviceAccountEmail } from "@/lib/google/calendar";
import { monthUsage } from "@/lib/margot/usage";
import { waMissing } from "@/lib/wa/config";
import { attentionCount, buildConnections, type Connection } from "./conexoes";
import { parseRoutine, ROUTINE_KEY } from "./routine";

const set = (name: string) => Boolean((process.env[name] ?? "").trim());

export interface ConexoesData {
  agora: string;
  conexoes: Connection[];
  pedemAtencao: number;
}

export async function getConexoes(now = new Date()): Promise<ConexoesData> {
  const [settings, usage, bills, routine] = await Promise.all([
    gestor.getSettings(),
    monthUsage(now),
    prisma.expense.aggregate({ where: { status: "a_pagar" }, _count: true, _sum: { amountCents: true } }),
    prisma.setting.findUnique({ where: { key: ROUTINE_KEY } }),
  ]);

  const conexoes = buildConnections({
    now,
    whatsapp: { missing: waMissing(), margotOn: settings.margotWhatsapp, ownerPhoneSet: Boolean(settings.ownerPhone) },
    agenda: { missing: [...(serviceAccountEmail() ? [] : ["GOOGLE_SERVICE_ACCOUNT_JSON"]), ...(calendarId() ? [] : ["GOOGLE_CALENDAR_ID"])] },
    financeiro: { openBills: bills._count, openBillsCents: bills._sum.amountCents ?? 0 },
    rotina: { record: parseRoutine(routine?.value), cronSecret: set("CRON_SECRET") },
    ia: { keySet: set("ANTHROPIC_API_KEY"), usageUsd: usage.usd, limitUsd: settings.margotLimitUsd },
    fotos: { missing: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].filter((n) => !set(n)) },
    api: { enabled: (process.env["AGENT_API_TOKEN"] ?? "").length >= 24 },
    instagram: { panelUrl: (process.env["INSTAGRAM_PANEL_URL"] ?? "").trim() },
  });

  return { agora: now.toISOString(), conexoes, pedemAtencao: attentionCount(conexoes) };
}
