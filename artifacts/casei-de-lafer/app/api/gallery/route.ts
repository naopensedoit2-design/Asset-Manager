import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    return NextResponse.json(images);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
