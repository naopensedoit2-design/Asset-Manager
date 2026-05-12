import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadImage, deleteImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string;
  const videoUrl = formData.get("videoUrl") as string | null;

  const existing = await prisma.heroImage.findFirst({ where: { type } });

  if (file) {
    const { url, publicId } = await uploadImage(file, "casei-de-lafer/hero");
    if (existing) {
      if (existing.publicId) await deleteImage(existing.publicId).catch(() => null);
      await prisma.heroImage.update({
        where: { id: existing.id },
        data: { url, publicId, ...(videoUrl !== null && { videoUrl }) },
      });
    } else {
      await prisma.heroImage.create({
        data: { type, url, publicId, videoUrl: videoUrl ?? "" },
      });
    }
  } else if (videoUrl !== null && existing) {
    await prisma.heroImage.update({
      where: { id: existing.id },
      data: { videoUrl },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { type } = await request.json();
  const existing = await prisma.heroImage.findFirst({ where: { type } });
  if (existing) {
    if (existing.publicId) await deleteImage(existing.publicId).catch(() => null);
    await prisma.heroImage.delete({ where: { id: existing.id } });
  }
  return NextResponse.json({ ok: true });
}
