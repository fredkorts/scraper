import { Router } from "express";
import {
    createNotificationChannelHandler,
    deleteNotificationChannelHandler,
    listNotificationChannelsHandler,
    updateNotificationChannelHandler,
} from "../controllers/notification-channel.controller";
import { requireAuth } from "../middleware/auth";

const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/channels", listNotificationChannelsHandler);
notificationsRouter.post("/channels", createNotificationChannelHandler);
notificationsRouter.patch("/channels/:id", updateNotificationChannelHandler);
notificationsRouter.delete("/channels/:id", deleteNotificationChannelHandler);

export { notificationsRouter };
