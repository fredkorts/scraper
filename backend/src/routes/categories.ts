import { Router } from "express";
import { listCategoriesHandler } from "../controllers/categories.controller";
import { updateCategorySettingsHandler } from "../controllers/settings-admin.controller";
import { adminMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";
import { requireAdmin, requireAuth } from "../middleware/auth";

const categoriesRouter = Router();

categoriesRouter.use(requireAuth);
categoriesRouter.get("/", highCostReadLimiter, listCategoriesHandler);
categoriesRouter.patch("/:id/settings", requireAdmin, adminMutationLimiter, updateCategorySettingsHandler);

export { categoriesRouter };
