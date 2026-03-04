import { Router } from "express";
import { getProductDetailHandler, getProductHistoryHandler } from "../controllers/products.controller";
import { requireAuth } from "../middleware/auth";
import { highCostReadLimiter } from "../middleware/rate-limit";

const productsRouter = Router();

productsRouter.use(requireAuth);
productsRouter.get("/:id", highCostReadLimiter, getProductDetailHandler);
productsRouter.get("/:id/history", highCostReadLimiter, getProductHistoryHandler);

export { productsRouter };
