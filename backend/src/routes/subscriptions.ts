import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
    createSubscriptionHandler,
    deleteSubscriptionHandler,
    listSubscriptionsHandler,
} from "../controllers/subscriptions.controller";
import { authenticatedMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";

const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);
subscriptionsRouter.get("/", highCostReadLimiter, listSubscriptionsHandler);
subscriptionsRouter.post("/", authenticatedMutationLimiter, createSubscriptionHandler);
subscriptionsRouter.delete("/:id", authenticatedMutationLimiter, deleteSubscriptionHandler);

export { subscriptionsRouter };
