import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { date, label } = await request.json();
    if (!date) {
      return NextResponse.json({ error: "Missing date" }, { status: 400 });
    }

    // Normalize date (expecting YYYY-MM-DD)
    const iso = `${date}T12:00:00Z`;
    const blocked = await prisma.blockedDate.create({
      data: {
        date: new Date(iso),
        label: label || "Reservado",
      },
    });

    return NextResponse.json({
      id: blocked.id,
      date: blocked.date.toISOString().split("T")[0],
      label: blocked.label,
    });
  } catch (err: any) {
    console.error("POST /api/admin/dates error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}
