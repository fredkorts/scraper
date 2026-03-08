import { Router } from "express";
import { getAdminSchedulerStateHandler } from "../controllers/settings-admin.controller";
import { requireAdmin, requireAuth, requireVerifiedEmail } from "../middleware/auth";
import { highCostReadLimiter } from "../middleware/rate-limit";

const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireVerifiedEmail);
adminRouter.use(requireAdmin);
adminRouter.get("/scheduler/state", highCostReadLimiter, getAdminSchedulerStateHandler);

export { adminRouter };
