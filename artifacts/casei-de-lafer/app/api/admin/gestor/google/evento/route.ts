import { NextRequest } from "next/server";
import { ok, route } from "@/lib/gestor/http";
import * as gestor from "@/lib/gestor/service";

export const dynamic = "force-dynamic";

// Dados de um casamento da Google Agenda para preencher o Novo pedido. Só o painel (login do dono) chega aqui.
export const GET = route(async (req: NextRequest) => ok(await gestor.googleBookingDraft(req.nextUrl.searchParams.get("id"))));
