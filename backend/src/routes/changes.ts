import { Router } from "express";
import { listChangesHandler } from "../controllers/runs.controller";
import { requireAuth } from "../middleware/auth";
import { highCostReadLimiter } from "../middleware/rate-limit";

const changesRouter = Router();

changesRouter.use(requireAuth);
changesRouter.get("/", highCostReadLimiter, listChangesHandler);

export { changesRouter };
