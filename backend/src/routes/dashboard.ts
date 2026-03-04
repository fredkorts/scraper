import { Router } from "express";
import { getDashboardHomeHandler } from "../controllers/runs.controller";
import { requireAuth } from "../middleware/auth";
import { highCostReadLimiter } from "../middleware/rate-limit";

const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get("/home", highCostReadLimiter, getDashboardHomeHandler);

export { dashboardRouter };
