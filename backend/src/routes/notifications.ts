import { Router } from "express";
import {
    createNotificationChannelHandler,
    deleteNotificationChannelHandler,
    listNotificationChannelsHandler,
    updateNotificationChannelHandler,
} from "../controllers/notification-channel.controller";
import { requireAuth } from "../middleware/auth";
import { authenticatedMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";

const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/channels", highCostReadLimiter, listNotificationChannelsHandler);
notificationsRouter.post("/channels", authenticatedMutationLimiter, createNotificationChannelHandler);
notificationsRouter.patch("/channels/:id", authenticatedMutationLimiter, updateNotificationChannelHandler);
notificationsRouter.delete("/channels/:id", authenticatedMutationLimiter, deleteNotificationChannelHandler);

export { notificationsRouter };
