import { Router } from "express";
import {
    confirmTelegramLinkChallengeHandler,
    createTelegramLinkChallengeHandler,
    createNotificationChannelHandler,
    deleteNotificationChannelHandler,
    getTelegramLinkStatusHandler,
    listNotificationChannelsHandler,
    telegramWebhookHandler,
    updateNotificationChannelHandler,
} from "../controllers/notification-channel.controller";
import { requireAuth, requireVerifiedEmail } from "../middleware/auth";
import { authenticatedMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";

const notificationsRouter = Router();

notificationsRouter.post("/telegram/webhook", authenticatedMutationLimiter, telegramWebhookHandler);

notificationsRouter.use(requireAuth);

notificationsRouter.get("/channels", highCostReadLimiter, listNotificationChannelsHandler);
notificationsRouter.post(
    "/channels",
    requireVerifiedEmail,
    authenticatedMutationLimiter,
    createNotificationChannelHandler,
);
notificationsRouter.post(
    "/channels/telegram/link",
    requireVerifiedEmail,
    authenticatedMutationLimiter,
    createTelegramLinkChallengeHandler,
);
notificationsRouter.get("/channels/telegram/link-status", highCostReadLimiter, getTelegramLinkStatusHandler);
notificationsRouter.post(
    "/channels/telegram/confirm",
    requireVerifiedEmail,
    authenticatedMutationLimiter,
    confirmTelegramLinkChallengeHandler,
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
