import { Router } from "express";
import {
    listTrackedProductsHandler,
    trackProductHandler,
    untrackProductByProductIdHandler,
} from "../controllers/tracked-products.controller";
import { requireAuth } from "../middleware/auth";
import { authenticatedMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";

const trackedProductsRouter = Router();

trackedProductsRouter.use(requireAuth);
trackedProductsRouter.get("/", highCostReadLimiter, listTrackedProductsHandler);
trackedProductsRouter.post("/", authenticatedMutationLimiter, trackProductHandler);
trackedProductsRouter.delete("/by-product/:productId", authenticatedMutationLimiter, untrackProductByProductIdHandler);

export { trackedProductsRouter };
