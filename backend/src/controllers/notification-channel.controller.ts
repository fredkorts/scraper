import type { NextFunction, Request, Response } from "express";
import {
    channelIdParamSchema,
    confirmTelegramLinkSchema,
    createNotificationChannelSchema,
    updateNotificationChannelSchema,
} from "../schemas/notification-channel";
import {
    createNotificationChannel,
    deleteNotificationChannel,
    listNotificationChannels,
    updateNotificationChannel,
} from "../services/notification-channel.service";
import {
    confirmTelegramLinkChallenge as confirmTelegramLinkChallengeService,
    createTelegramLinkChallenge as createTelegramLinkChallengeService,
    getTelegramLinkStatus as getTelegramLinkStatusService,
    processTelegramWebhookStart as processTelegramWebhookStartService,
} from "../services/telegram-notification-channel.service";

export const listNotificationChannelsHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const channels = await listNotificationChannels(req.auth!.userId);
        res.status(200).json({ channels });
    } catch (error) {
        next(error);
    }
};

export const createNotificationChannelHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const input = createNotificationChannelSchema.parse(req.body);
        const channel = await createNotificationChannel(req.auth!.userId, input);
        res.status(201).json({ channel });
    } catch (error) {
        next(error);
    }
};

export const updateNotificationChannelHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const params = channelIdParamSchema.parse(req.params);
        const input = updateNotificationChannelSchema.parse(req.body);

        const channel = await updateNotificationChannel(req.auth!.userId, params.id, input);
        res.status(200).json({ channel });
    } catch (error) {
        next(error);
    }
};

export const deleteNotificationChannelHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const params = channelIdParamSchema.parse(req.params);
        const result = await deleteNotificationChannel(req.auth!.userId, params.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const createTelegramLinkChallengeHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const result = await createTelegramLinkChallengeService(req.auth!.userId, {
            createdByIp: req.ip,
            createdByUserAgent: req.get("user-agent") ?? undefined,
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getTelegramLinkStatusHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await getTelegramLinkStatusService(req.auth!.userId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const confirmTelegramLinkChallengeHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const input = confirmTelegramLinkSchema.parse(req.body);
        const result = await confirmTelegramLinkChallengeService(req.auth!.userId, input.challengeId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const telegramWebhookHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await processTelegramWebhookStartService(
            req.body as Record<string, unknown>,
            req.get("x-telegram-bot-api-secret-token") ?? undefined,
        );
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
