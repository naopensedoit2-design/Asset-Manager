import { Router, type IRouter } from "express";
import { prisma } from "../lib/prisma";

const router: IRouter = Router();

router.get("/gallery", async (req, res): Promise<void> => {
  const images = await prisma.galleryImage.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  res.json(images);
});

export default router;
