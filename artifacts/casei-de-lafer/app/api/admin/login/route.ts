import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const hash = process.env["ADMIN_PASSWORD_HASH"];
  const secret = process.env["SESSION_SECRET"];

  if (!hash || !secret) {
    return NextResponse.json({ error: "Erro de configuração" }, { status: 500 });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin-session", secret, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    maxAge: 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
