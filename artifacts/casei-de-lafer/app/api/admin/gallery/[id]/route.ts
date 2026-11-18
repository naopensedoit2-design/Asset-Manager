import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteImage } from "@/lib/storage";
import { atualizarPaginaInicial } from "@/lib/landing/revalidar";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const image = await prisma.galleryImage.findUnique({
    where: { id: parseInt(id) },
  });
  if (image?.publicId) await deleteImage(image.publicId).catch(() => null);
  await prisma.galleryImage.delete({ where: { id: parseInt(id) } });
  atualizarPaginaInicial();
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const corpo = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  // Só os três campos de texto, cada um limitado; o que não vier fica como está.
  const texto = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : undefined);
  const data = {
    alt: texto(corpo.alt, 200),
    coupleTag: texto(corpo.coupleTag, 80),
    location: texto(corpo.location, 120),
  };
  const updated = await prisma.galleryImage.update({
    where: { id: parseInt(id) },
    data,
  });
  atualizarPaginaInicial();
  return NextResponse.json(updated);
}
