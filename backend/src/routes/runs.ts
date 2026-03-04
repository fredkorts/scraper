import { Router } from "express";
import {
    getRunDetailHandler,
    listRunChangesHandler,
    listRunProductsHandler,
    listRunsHandler,
} from "../controllers/runs.controller";
import { adminMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";
import { triggerRunHandler } from "../controllers/settings-admin.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

const runsRouter = Router();

runsRouter.use(requireAuth);
runsRouter.get("/", highCostReadLimiter, listRunsHandler);
runsRouter.post("/trigger", requireAdmin, adminMutationLimiter, triggerRunHandler);
runsRouter.get("/:id", highCostReadLimiter, getRunDetailHandler);
runsRouter.get("/:id/products", highCostReadLimiter, listRunProductsHandler);
runsRouter.get("/:id/changes", highCostReadLimiter, listRunChangesHandler);

export { runsRouter };
