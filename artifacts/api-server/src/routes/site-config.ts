import { Router, type IRouter } from "express";
import { prisma } from "../lib/prisma";
import { config } from "../lib/config";

const router: IRouter = Router();

router.get("/site-config", async (req, res): Promise<void> => {
  let siteConfig = await prisma.siteConfig.findFirst();
  if (!siteConfig) {
    siteConfig = await prisma.siteConfig.create({ data: {} });
  }
  res.json({
    whatsappNumber: config.whatsapp.number,
    weddingCount: siteConfig.weddingCount,
    driverQuote: siteConfig.driverQuote,
  });
});

export default router;
