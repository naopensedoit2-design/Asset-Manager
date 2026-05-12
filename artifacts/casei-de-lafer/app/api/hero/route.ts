import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const images = await prisma.heroImage.findMany();
    const desktop = images.find((i) => i.type === "desktop") ?? null;
    const mobile = images.find((i) => i.type === "mobile") ?? null;
    return NextResponse.json({ desktop, mobile });
  } catch {
    return NextResponse.json({ desktop: null, mobile: null }, { status: 200 });
  }
}
