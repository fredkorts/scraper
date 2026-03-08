import { Router } from "express";
import {
    createNotificationChannelHandler,
    deleteNotificationChannelHandler,
    listNotificationChannelsHandler,
    updateNotificationChannelHandler,
} from "../controllers/notification-channel.controller";
import { requireAuth, requireVerifiedEmail } from "../middleware/auth";
import { authenticatedMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";

const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/channels", highCostReadLimiter, listNotificationChannelsHandler);
notificationsRouter.post(
    "/channels",
    requireVerifiedEmail,
    authenticatedMutationLimiter,
    createNotificationChannelHandler,
);
notificationsRouter.patch(
    "/channels/:id",
    requireVerifiedEmail,
    authenticatedMutationLimiter,
    updateNotificationChannelHandler,
);
notificationsRouter.delete(
    "/channels/:id",
    requireVerifiedEmail,
    authenticatedMutationLimiter,
    deleteNotificationChannelHandler,
);

export { notificationsRouter };
