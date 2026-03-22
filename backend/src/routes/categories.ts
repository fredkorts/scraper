import { Router } from "express";
import { listCategoriesHandler } from "../controllers/categories.controller";
import { updateCategorySettingsHandler } from "../controllers/settings-admin.controller";
import { adminMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";
import { requireAdmin, requireAuth, requireAuthzFresh } from "../middleware/auth";
import { requireMutationProtection } from "../middleware/csrf";

const categoriesRouter = Router();

categoriesRouter.use(requireAuth);
categoriesRouter.get("/", highCostReadLimiter, listCategoriesHandler);
categoriesRouter.patch(
    "/:id/settings",
    requireAuthzFresh,
    requireAdmin,
    adminMutationLimiter,
    requireMutationProtection,
    updateCategorySettingsHandler,
);

export { categoriesRouter };
