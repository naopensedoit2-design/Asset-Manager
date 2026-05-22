import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();

  let cfg = await prisma.siteConfig.findFirst();
  if (!cfg) cfg = await prisma.siteConfig.create({ data: {} });

  const updated = await prisma.siteConfig.update({
    where: { id: cfg.id },
    data: {
      ...(body.whatsappNumber !== undefined && {
        whatsappNumber: body.whatsappNumber,
      }),
      ...(body.weddingCount !== undefined && {
        weddingCount: Number(body.weddingCount),
      }),
      ...(body.driverQuote !== undefined && { driverQuote: body.driverQuote }),
      ...(body.showCalendar !== undefined && { showCalendar: Boolean(body.showCalendar) }),
    },
  });

  return NextResponse.json(updated);
}
