import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const blockedDates = await prisma.blockedDate.findMany({
      orderBy: { date: "asc" },
    });
    return NextResponse.json(
      blockedDates.map((d: any) => ({
        id: d.id,
        date: d.date.toISOString().split("T")[0],
        label: d.label,
      })),
    );
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
