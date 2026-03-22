import { Router } from "express";
import {
    listTrackedProductsHandler,
    trackProductHandler,
    untrackProductByProductIdHandler,
} from "../controllers/tracked-products.controller";
import { requireAuth } from "../middleware/auth";
import { requireMutationProtection } from "../middleware/csrf";
import { authenticatedMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";

const trackedProductsRouter = Router();

trackedProductsRouter.use(requireAuth);
trackedProductsRouter.get("/", highCostReadLimiter, listTrackedProductsHandler);
trackedProductsRouter.post("/", authenticatedMutationLimiter, requireMutationProtection, trackProductHandler);
trackedProductsRouter.delete(
    "/by-product/:productId",
    authenticatedMutationLimiter,
    requireMutationProtection,
    untrackProductByProductIdHandler,
);

export { trackedProductsRouter };
