import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Datas reservadas para o calendário público do site.
// A Google Agenda pessoal do Leonardo NUNCA aparece aqui: ela só é usada por dentro
// (painel e Margot) para saber se o dia está livre. Clientes veem apenas as datas
// reservadas pelo próprio negócio, e nada quando o calendário está desligado no admin.
// ?manual=1 devolve os bloqueios para a tela do admin (protegida pelo login).
export async function GET(req: NextRequest) {
  try {
    const manualOnly = req.nextUrl.searchParams.get("manual") === "1";
    if (!manualOnly) {
      const cfg = await prisma.siteConfig.findFirst();
      if (cfg && cfg.showCalendar === false) return NextResponse.json([]);
    }
    const blockedDates = await prisma.blockedDate.findMany({ orderBy: { date: "asc" } });
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
