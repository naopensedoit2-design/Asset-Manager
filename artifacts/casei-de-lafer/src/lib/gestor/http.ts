import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { RuleError } from "./rules";

// Formato único de resposta: { ok: true, data } ou { ok: false, erro: { codigo, mensagem } }.

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(codigo: string, mensagem: string, status: number) {
  return NextResponse.json({ ok: false, erro: { codigo, mensagem } }, { status });
}

export async function readJson(req: NextRequest): Promise<Record<string, any>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    throw new RuleError("json_invalido", "Corpo da requisição precisa ser JSON.", 400);
  }
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Envolve um handler: converte RuleError em resposta clara e esconde erros internos. */
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof RuleError) return fail(e.code, e.message, e.httpStatus);
      console.error(`[gestor] ${req.method} ${req.nextUrl.pathname}`, e);
      return fail("erro_interno", "Algo deu errado no servidor. Tente novamente.", 500);
    }
  };
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function bearer(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

/** Rotas /api/v1: exigem Authorization: Bearer <AGENT_API_TOKEN>. */
export function agentRoute<C>(handler: Handler<C>): Handler<C> {
  return route(async (req, ctx) => {
    const expected = process.env["AGENT_API_TOKEN"];
    if (!expected || expected.length < 24) {
      return fail("api_desativada", "Defina AGENT_API_TOKEN (mínimo 24 caracteres) para ativar a API.", 503);
    }
    if (!safeEqual(bearer(req), expected)) return fail("nao_autorizado", "Token inválido ou ausente.", 401);
    return handler(req, ctx);
  });
}

/** Rotas de cron da Vercel: exigem Authorization: Bearer <CRON_SECRET>. */
export function cronRoute<C>(handler: Handler<C>): Handler<C> {
  return route(async (req, ctx) => {
    const expected = process.env["CRON_SECRET"];
    if (!expected) return fail("cron_desativado", "Defina CRON_SECRET para ativar a rotina diária.", 503);
    if (!safeEqual(bearer(req), expected)) return fail("nao_autorizado", "Token inválido ou ausente.", 401);
    return handler(req, ctx);
  });
}

export type IdContext = { params: Promise<{ id: string }> };
