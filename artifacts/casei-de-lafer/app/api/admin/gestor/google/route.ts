import { ok, route } from "@/lib/gestor/http";
import { calendarStatus } from "@/lib/google/calendar";
import { prisma } from "@/lib/prisma";
import { syncOrderCalendar } from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok(await calendarStatus()));

// Envia para a agenda os pedidos confirmados que ainda não estão lá (útil logo após conectar).
export const POST = route(async () => {
  const pending = await prisma.reservation.findMany({
    where: { activeDate: { not: null }, kind: "confirmada", googleEventId: null },
    select: { orderId: true },
  });
  for (const r of pending) await syncOrderCalendar(r.orderId);
  return ok({ enviados: pending.length });
});
