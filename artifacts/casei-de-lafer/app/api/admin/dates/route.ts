import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { date, label } = await request.json();
  const blocked = await prisma.blockedDate.create({
    data: {
      date: new Date(date + "T12:00:00Z"),
      label: label || "Reservado",
    },
  });
  return NextResponse.json({
    id: blocked.id,
    date: blocked.date.toISOString().split("T")[0],
    label: blocked.label,
  });
}
