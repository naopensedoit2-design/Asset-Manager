import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { googleBusyDays } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

// Datas ocupadas para o calendário público do site.
// ?manual=1 devolve só os bloqueios feitos à mão (usado pelo admin para desbloquear).
export async function GET(req: NextRequest) {
  try {
    const blockedDates = await prisma.blockedDate.findMany({ orderBy: { date: "asc" } });
    const manual = blockedDates.map((d: any) => ({
      id: d.id,
      date: d.date.toISOString().split("T")[0],
      label: d.label,
    }));
    if (req.nextUrl.searchParams.get("manual") === "1") return NextResponse.json(manual);

    // Compromissos da Google Agenda aparecem como "Reservado", sem expor o título.
    const taken = new Set(manual.map((d) => d.date));
    const google = (await googleBusyDays())
      .filter((g) => !taken.has(g.date))
      .map((g) => ({ id: 0, date: g.date, label: "Reservado" }));
    return NextResponse.json([...manual, ...google].sort((a, b) => a.date.localeCompare(b.date)));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
