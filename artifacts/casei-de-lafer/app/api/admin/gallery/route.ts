import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)
      .slice(0, 20);

    if (!files.length) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 },
      );
    }

    // Sequential uploads avoid Cloudinary rate limits and keep memory lower
    // than Promise.all when several large images arrive together.
    const uploaded = [];
    for (const file of files) {
      const { url, publicId } = await uploadImage(
        file,
        "casei-de-lafer/gallery",
      );
      uploaded.push(
        await prisma.galleryImage.create({ data: { url, publicId } }),
      );
    }

    return NextResponse.json(uploaded);
  } catch (err) {
    console.error("POST /api/admin/gallery error:", err);
    return NextResponse.json(
      { error: "Falha ao enviar foto(s)" },
      { status: 500 },
    );
  }
}
