import { Router, type IRouter } from "express";
import healthRouter from "./health";
import heroRouter from "./hero";
import galleryRouter from "./gallery";
import datesRouter from "./dates";
import siteConfigRouter from "./site-config";

const router: IRouter = Router();

router.use(healthRouter);
router.use(heroRouter);
router.use(galleryRouter);
router.use(datesRouter);
router.use(siteConfigRouter);

export default router;
