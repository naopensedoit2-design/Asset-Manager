// Número público da Margot (para links wa.me), lido da Meta e guardado por 6 h. Sem Meta, usa o do site.

import { prisma } from "@/lib/prisma";
import { phoneInfo } from "./client";
import { waCanSend } from "./config";

let cache: { at: number; digits: string } | null = null;

export async function margotNumber(): Promise<string> {
  if (cache && Date.now() - cache.at < 6 * 3_600_000) return cache.digits;
  let digits = "";
  if (waCanSend()) {
    digits = ((await phoneInfo().catch(() => null))?.display_phone_number ?? "").replace(/\D/g, "");
  }
  if (!digits) {
    const site = await prisma.siteConfig.findFirst({ select: { whatsappNumber: true } }).catch(() => null);
    digits = (site?.whatsappNumber || process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  }
  if (digits) cache = { at: Date.now(), digits };
  return digits;
}
