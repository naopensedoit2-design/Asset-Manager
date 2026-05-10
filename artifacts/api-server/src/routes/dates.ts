import { Router, type IRouter } from "express";
import { prisma } from "../lib/prisma";

const router: IRouter = Router();

router.get("/dates", async (req, res): Promise<void> => {
  const blockedDates = await prisma.blockedDate.findMany({
    orderBy: { date: "asc" },
  });
  res.json(
    blockedDates.map((d) => ({
      id: d.id,
      date: d.date.toISOString().split("T")[0],
      label: d.label,
    })),
  );
});

export default router;
