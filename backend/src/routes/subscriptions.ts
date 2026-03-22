import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireMutationProtection } from "../middleware/csrf";
import {
    createSubscriptionHandler,
    deleteSubscriptionHandler,
    listSubscriptionsHandler,
} from "../controllers/subscriptions.controller";
import { authenticatedMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";

const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);
subscriptionsRouter.get("/", highCostReadLimiter, listSubscriptionsHandler);
subscriptionsRouter.post("/", authenticatedMutationLimiter, requireMutationProtection, createSubscriptionHandler);
subscriptionsRouter.delete("/:id", authenticatedMutationLimiter, requireMutationProtection, deleteSubscriptionHandler);

export { subscriptionsRouter };
