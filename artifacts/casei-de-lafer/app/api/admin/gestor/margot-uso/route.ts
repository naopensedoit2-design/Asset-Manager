import { ok, route } from "@/lib/gestor/http";
import { getSettings } from "@/lib/gestor/service";
import { monthUsage } from "@/lib/margot/usage";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const [uso, settings] = await Promise.all([monthUsage(), getSettings()]);
  return ok({
    ...uso,
    limiteUsd: settings.margotLimitUsd,
    cotacao: settings.dollarRate,
    ligada: Boolean(process.env["ANTHROPIC_API_KEY"]) && settings.margotLimitUsd > 0 && uso.usd < settings.margotLimitUsd,
    temChave: Boolean(process.env["ANTHROPIC_API_KEY"]),
    modelo: process.env["MARGOT_MODEL"] || "claude-sonnet-5-5",
  });
});
