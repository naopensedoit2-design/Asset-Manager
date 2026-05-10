import { Router, type IRouter } from "express";
import { prisma } from "../lib/prisma";

const router: IRouter = Router();

router.get("/hero", async (req, res): Promise<void> => {
  const images = await prisma.heroImage.findMany();
  const desktop = images.find((i) => i.type === "desktop") ?? null;
  const mobile = images.find((i) => i.type === "mobile") ?? null;
  res.json({ desktop, mobile });
});

export default router;
