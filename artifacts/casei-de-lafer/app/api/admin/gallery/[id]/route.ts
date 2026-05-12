import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteImage } from "@/lib/storage";

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
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { coupleTag, location } = await request.json();
  const updated = await prisma.galleryImage.update({
    where: { id: parseInt(id) },
    data: { coupleTag, location },
  });
  return NextResponse.json(updated);
}
