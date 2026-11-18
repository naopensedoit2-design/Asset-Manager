import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Endereço público: só o que a página pode mostrar (sem a tag do casal nem o campo "Local").
// O painel usa /api/admin/gallery, que traz todas as fotos com todos os campos.
export async function GET() {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, url: true, alt: true },
    });
    return NextResponse.json(images);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
