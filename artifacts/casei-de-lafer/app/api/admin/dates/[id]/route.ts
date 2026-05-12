import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await prisma.blockedDate.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
