import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  const uploaded = await Promise.all(
    files.slice(0, 20).map(async (file) => {
      const { url, publicId } = await uploadImage(
        file,
        "casei-de-lafer/gallery",
      );
      return prisma.galleryImage.create({ data: { url, publicId } });
    }),
  );

  return NextResponse.json(uploaded);
}
