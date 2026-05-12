import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let siteConfig = await prisma.siteConfig.findFirst();
    if (!siteConfig) {
      siteConfig = await prisma.siteConfig.create({ data: {} });
    }
    return NextResponse.json({
      whatsappNumber: process.env["WHATSAPP_NUMBER"] ?? "5554999999999",
      weddingCount: siteConfig.weddingCount,
      driverQuote: siteConfig.driverQuote,
    });
  } catch {
    return NextResponse.json({
      whatsappNumber: process.env["WHATSAPP_NUMBER"] ?? "5554999999999",
      weddingCount: 0,
      driverQuote: "",
    });
  }
}
