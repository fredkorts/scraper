import { NotificationChannelType, Prisma, UserRole } from "@prisma/client";
import type { NotificationChannel } from "@mabrik/shared";
import { config } from "../config";
import { AppError } from "../lib/errors";
import { generateOneTimeToken, hashToken } from "../lib/hash";
import { prisma } from "../lib/prisma";
import { createTelegramTransport } from "../notifications/transport";
import type { TelegramTransport } from "../notifications/types";
import { ensureSingleDefaultInvariant, toNotificationChannel } from "./notification-channel.service";

const TELEGRAM_LINK_TTL_MS = 10 * 60 * 1000;
const TELEGRAM_CHANNEL = NotificationChannelType.TELEGRAM;

type TelegramLinkStatusValue = "none" | "awaiting_telegram" | "awaiting_confirmation" | "expired" | "connected";

interface TelegramWebhookStartPayload {
    update_id?: number | string;
    message?: {
        text?: string;
        chat?: {
            id?: number | string;
            type?: string;
        };
        from?: {
            id?: number | string;
        };
    };
}

const requireTelegramFeatureEnabled = () => {
    if (!config.NOTIFICATIONS_TELEGRAM_ENABLED) {
        throw new AppError(503, "not_enabled", "Telegram notifications are currently disabled");
    }
};

const requireTelegramBotUsername = () => {
    const username = config.TELEGRAM_BOT_USERNAME?.trim();
    if (!username) {
        throw new AppError(503, "telegram_not_configured", "Telegram bot is not configured");
    }
    return username;
};

const toTelegramIdString = (value: number | string | undefined): string | null => {
    if (value === undefined) {
        return null;
    }
    return String(value).trim();
};

const extractStartToken = (text: string): string | null => {
    const match = text.trim().match(/^\/start(?:@\w+)?\s+(\S+)$/i);
    if (!match) {
        return null;
    }
    return match[1] ?? null;
};

const maskTelegramIdentity = (chatId?: string | null, userId?: string | null): string | undefined => {
    const target = (chatId ?? userId ?? "").trim();
    if (!target) {
        return undefined;
    }

    const tail = target.slice(-4);
    return `Telegram ••••${tail}`;
};

const requireEntitledUser = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            isActive: true,
        },
    });

    if (!user || !user.isActive) {
        throw new AppError(403, "account_inactive", "Account is inactive");
    }

    if (user.role === UserRole.FREE) {
        throw new AppError(403, "telegram_not_allowed_for_plan", "Telegram is available on paid and admin plans");
    }

    return user;
};

const upsertActiveTelegramChannel = async (
    tx: Prisma.TransactionClient,
    userId: string,
    destination: string,
): Promise<NotificationChannel> => {
    const existingByDestination = await tx.notificationChannel.findFirst({
        where: {
            userId,
            channelType: TELEGRAM_CHANNEL,
            destination,
        },
    });

    const activePrimary = await tx.notificationChannel.findFirst({
        where: {
            userId,
            channelType: TELEGRAM_CHANNEL,
            isActive: true,
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    let channelRecord;

    if (activePrimary) {
        channelRecord = await tx.notificationChannel.update({
            where: { id: activePrimary.id },
            data: {
                destination,
                isActive: true,
            },
        });
    } else if (existingByDestination) {
        channelRecord = await tx.notificationChannel.update({
            where: { id: existingByDestination.id },
            data: {
                isActive: true,
            },
        });
    } else {
        channelRecord = await tx.notificationChannel.create({
            data: {
                userId,
                channelType: TELEGRAM_CHANNEL,
                destination,
                isDefault: false,
                isActive: true,
            },
        });
    }

    await tx.notificationChannel.updateMany({
        where: {
            userId,
            channelType: TELEGRAM_CHANNEL,
            id: {
                not: channelRecord.id,
            },
        },
        data: {
            isActive: false,
            isDefault: false,
        },
    });

    await ensureSingleDefaultInvariant(tx, userId, channelRecord.isDefault ? channelRecord.id : undefined);

    const refreshed = await tx.notificationChannel.findUniqueOrThrow({
        where: { id: channelRecord.id },
    });

    return toNotificationChannel(refreshed);
};

export const createTelegramLinkChallenge = async (
    userId: string,
    metadata?: { createdByIp?: string; createdByUserAgent?: string },
): Promise<{ deepLinkUrl: string; expiresAt: string }> => {
    requireTelegramFeatureEnabled();
    await requireEntitledUser(userId);
    const botUsername = requireTelegramBotUsername();
    const token = generateOneTimeToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TELEGRAM_LINK_TTL_MS);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.telegramLinkChallenge.updateMany({
            where: {
                userId,
                confirmedAt: null,
                usedAt: null,
            },
            data: {
                usedAt: now,
            },
        });

        await tx.telegramLinkChallenge.create({
            data: {
                userId,
                tokenHash,
                expiresAt,
                createdByIp: metadata?.createdByIp,
                createdByUserAgent: metadata?.createdByUserAgent,
            },
        });
    });

    return {
        deepLinkUrl: `https://t.me/${botUsername}?start=${token}`,
        expiresAt: expiresAt.toISOString(),
    };
};

export const getTelegramLinkStatus = async (
    userId: string,
): Promise<{
    status: TelegramLinkStatusValue;
    challengeId?: string;
    expiresAt?: string;
    telegramAccountPreview?: string;
}> => {
    requireTelegramFeatureEnabled();
    await requireEntitledUser(userId);

    const latest = await prisma.telegramLinkChallenge.findFirst({
        where: {
            userId,
            confirmedAt: null,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    if (!latest) {
        return { status: "none" };
    }

    const now = Date.now();
    const isExpired = latest.expiresAt.getTime() <= now;

    if (isExpired) {
        return {
            status: "expired",
            challengeId: latest.id,
            expiresAt: latest.expiresAt.toISOString(),
            telegramAccountPreview: maskTelegramIdentity(latest.telegramChatId, latest.telegramUserId),
        };
    }

    if (!latest.usedAt) {
        return {
            status: "awaiting_telegram",
            challengeId: latest.id,
            expiresAt: latest.expiresAt.toISOString(),
        };
    }

    return {
        status: "awaiting_confirmation",
        challengeId: latest.id,
        expiresAt: latest.expiresAt.toISOString(),
        telegramAccountPreview: maskTelegramIdentity(latest.telegramChatId, latest.telegramUserId),
    };
};

export const processTelegramWebhookStart = async (
    payload: TelegramWebhookStartPayload,
    webhookSecret?: string,
): Promise<{ success: true; consumed: boolean }> => {
    requireTelegramFeatureEnabled();
    const expectedSecret = config.TELEGRAM_WEBHOOK_SECRET?.trim();

    if (!expectedSecret || webhookSecret !== expectedSecret) {
        throw new AppError(401, "telegram_webhook_unauthorized", "Invalid Telegram webhook secret");
    }

    const updateIdRaw = payload.update_id;
    if (updateIdRaw === undefined || updateIdRaw === null) {
        return { success: true, consumed: false };
    }

    const updateIdString = String(updateIdRaw).trim();
    if (!/^-?\d+$/.test(updateIdString)) {
        return { success: true, consumed: false };
    }

    const updateId = BigInt(updateIdString);

    try {
        await prisma.telegramWebhookEvent.create({
            data: {
                updateId,
            },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return { success: true, consumed: false };
        }
        throw error;
    }

    const text = payload.message?.text;
    const chatType = payload.message?.chat?.type;
    if (!text || chatType !== "private") {
        return { success: true, consumed: false };
    }

    const token = extractStartToken(text);
    if (!token) {
        return { success: true, consumed: false };
    }

    const challenge = await prisma.telegramLinkChallenge.findFirst({
        where: {
            tokenHash: hashToken(token),
            confirmedAt: null,
            usedAt: null,
            expiresAt: {
                gt: new Date(),
            },
        },
        select: {
            id: true,
            userId: true,
        },
    });

    if (!challenge) {
        return { success: true, consumed: false };
    }

    const chatId = toTelegramIdString(payload.message?.chat?.id);
    if (!chatId) {
        return { success: true, consumed: false };
    }

    const userId = toTelegramIdString(payload.message?.from?.id);
    const now = new Date();
    const updated = await prisma.telegramLinkChallenge.updateMany({
        where: {
            id: challenge.id,
            usedAt: null,
            confirmedAt: null,
            expiresAt: {
                gt: now,
            },
        },
        data: {
            usedAt: now,
            telegramChatId: chatId,
            telegramUserId: userId,
        },
    });

    if (updated.count === 1) {
        await prisma.telegramWebhookEvent.updateMany({
            where: {
                updateId,
            },
            data: {
                userId: challenge.userId,
            },
        });
        return { success: true, consumed: true };
    }

    return { success: true, consumed: false };
};

export const confirmTelegramLinkChallenge = async (
    userId: string,
    challengeId: string,
    transport: TelegramTransport = createTelegramTransport(),
): Promise<{
    channel: NotificationChannel;
    verificationMessage: {
        status: "sent" | "failed";
        warning?: string;
    };
}> => {
    requireTelegramFeatureEnabled();
    await requireEntitledUser(userId);
    const now = new Date();

    const challenge = await prisma.telegramLinkChallenge.findFirst({
        where: {
            id: challengeId,
            userId,
        },
    });

    if (!challenge) {
        throw new AppError(404, "telegram_link_not_found", "Telegram link challenge was not found");
    }

    if (challenge.confirmedAt) {
        throw new AppError(409, "telegram_link_already_confirmed", "Telegram link challenge is already confirmed");
    }

    if (!challenge.usedAt || !challenge.telegramChatId) {
        throw new AppError(400, "telegram_link_not_ready", "Telegram link challenge has not been consumed yet");
    }

    if (challenge.expiresAt.getTime() <= now.getTime()) {
        throw new AppError(400, "telegram_link_expired", "Telegram link challenge has expired");
    }
    const telegramChatId = challenge.telegramChatId;
    if (!telegramChatId) {
        throw new AppError(400, "telegram_link_not_ready", "Telegram link challenge has not been consumed yet");
    }

    const channel = await prisma.$transaction(async (tx) => {
        const confirmed = await tx.telegramLinkChallenge.updateMany({
            where: {
                id: challenge.id,
                userId,
                confirmedAt: null,
                usedAt: {
                    not: null,
                },
                expiresAt: {
                    gt: now,
                },
            },
            data: {
                confirmedAt: now,
            },
        });

        if (confirmed.count === 0) {
            throw new AppError(409, "telegram_link_already_confirmed", "Telegram link challenge is already confirmed");
        }

        return upsertActiveTelegramChannel(tx, userId, telegramChatId);
    });

    try {
        await transport.sendTelegramMessage({
            chatId: telegramChatId,
            text: "PricePulse: Telegram connected successfully. You will now receive alerts here.",
        });

        await prisma.telegramLinkChallenge.update({
            where: { id: challenge.id },
            data: {
                verificationMessageSentAt: new Date(),
                verificationMessageFailedAt: null,
                verificationMessageError: null,
            },
        });

        return {
            channel,
            verificationMessage: {
                status: "sent",
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Telegram verification message failed";
        await prisma.telegramLinkChallenge.update({
            where: { id: challenge.id },
            data: {
                verificationMessageFailedAt: new Date(),
                verificationMessageError: message.slice(0, 500),
            },
        });

        return {
            channel,
            verificationMessage: {
                status: "failed",
                warning: "Telegram channel connected, but verification message could not be sent.",
            },
        };
    }
};
