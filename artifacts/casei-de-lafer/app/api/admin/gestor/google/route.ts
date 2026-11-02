import { ok, route } from "@/lib/gestor/http";
import { calendarStatus } from "@/lib/google/calendar";
import { prisma } from "@/lib/prisma";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const status = await calendarStatus();
  if (!status.casamentos) return ok(status);
  // Casamentos que já têm pedido no painel.
  const linked = await gestor.googleLinkedOrders();
  return ok({ ...status, casamentos: status.casamentos.map((c) => ({ ...c, pedido: linked.get(c.id)?.orderId ?? null })) });
});

// Envia para a agenda os pedidos confirmados que ainda não estão lá (útil logo após conectar).
// Pedido ligado a um casamento que o dono já anotou na agenda não entra: a reserva guarda o id desse evento.
export const POST = route(async () => {
  const pending = await prisma.reservation.findMany({
    where: { activeDate: { not: null }, kind: "confirmada", googleEventId: null },
    select: { orderId: true },
  });
  for (const r of pending) await gestor.syncOrderCalendar(r.orderId);
  return ok({ enviados: pending.length });
});
