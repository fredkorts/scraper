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
import { requireMutationProtection } from "../middleware/csrf";
import { authenticatedMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";

const notificationsRouter = Router();

notificationsRouter.post("/telegram/webhook", authenticatedMutationLimiter, telegramWebhookHandler);

notificationsRouter.use(requireAuth);

notificationsRouter.get("/channels", highCostReadLimiter, listNotificationChannelsHandler);
notificationsRouter.post(
    "/channels",
    requireVerifiedEmail,
    authenticatedMutationLimiter,
    requireMutationProtection,
    createNotificationChannelHandler,
);
notificationsRouter.post(
    "/channels/telegram/link",
    requireVerifiedEmail,
    authenticatedMutationLimiter,
    requireMutationProtection,
    createTelegramLinkChallengeHandler,
);
notificationsRouter.get("/channels/telegram/link-status", highCostReadLimiter, getTelegramLinkStatusHandler);
notificationsRouter.post(
    "/channels/telegram/confirm",
    requireVerifiedEmail,
    authenticatedMutationLimiter,
    requireMutationProtection,
    confirmTelegramLinkChallengeHandler,
);
notificationsRouter.patch(
    "/channels/:id",
    requireVerifiedEmail,
    authenticatedMutationLimiter,
    requireMutationProtection,
    updateNotificationChannelHandler,
);
notificationsRouter.delete(
    "/channels/:id",
    requireVerifiedEmail,
    authenticatedMutationLimiter,
    requireMutationProtection,
    deleteNotificationChannelHandler,
);

export { notificationsRouter };
