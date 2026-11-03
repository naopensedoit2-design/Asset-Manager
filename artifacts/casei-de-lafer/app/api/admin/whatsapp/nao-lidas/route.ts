import { ok, route } from "@/lib/gestor/http";
import { ignoredCount, unreadTotal } from "@/lib/wa/admin";

export const dynamic = "force-dynamic";

// { total: mensagens não lidas das conversas atendidas, ignoradas: quantas conversas estão ignoradas }
export const GET = route(async () => {
  const [total, ignoradas] = await Promise.all([unreadTotal(), ignoredCount()]);
  return ok({ total, ignoradas });
});
