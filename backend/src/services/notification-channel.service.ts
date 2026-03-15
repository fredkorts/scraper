import { NotificationChannelType, Prisma } from "@prisma/client";
import type {
    ChannelType,
    NotificationChannel,
    NotificationChannelCreateRequest,
    NotificationChannelUpdateRequest,
} from "@mabrik/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";

const EMAIL_CHANNEL = NotificationChannelType.EMAIL;

const mapChannelType = (channelType: NotificationChannelType): ChannelType => {
    switch (channelType) {
        case NotificationChannelType.EMAIL:
            return "email" as ChannelType;
        case NotificationChannelType.TELEGRAM:
            return "telegram" as ChannelType;
        case NotificationChannelType.DISCORD:
            return "discord" as ChannelType;
        case NotificationChannelType.WHATSAPP:
            return "whatsapp" as ChannelType;
        case NotificationChannelType.SIGNAL:
            return "signal" as ChannelType;
        case NotificationChannelType.SMS:
            return "sms" as ChannelType;
        default:
            return "email" as ChannelType;
    }
};

export const toNotificationChannel = (channel: {
    id: string;
    userId: string;
    channelType: NotificationChannelType;
    destination: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
}): NotificationChannel => {
    return {
        id: channel.id,
        userId: channel.userId,
        channelType: mapChannelType(channel.channelType),
        destination: channel.destination,
        isDefault: channel.isDefault,
        isActive: channel.isActive,
        createdAt: channel.createdAt.toISOString(),
    };
};

const normalizeEmailDestination = (destination: string): string => {
    return destination.trim().toLowerCase();
};

const ensureSupportedChannelType = (channelType: string) => {
    if (channelType !== "email") {
        throw new AppError(400, "unsupported_channel_type", "Only email channels are supported right now");
    }
};

export const ensureSingleDefaultInvariant = async (
    tx: Prisma.TransactionClient,
    userId: string,
    preferredChannelId?: string,
): Promise<void> => {
    const activeChannels = await tx.notificationChannel.findMany({
        where: {
            userId,
            isActive: true,
        },
        select: {
            id: true,
            isDefault: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    if (activeChannels.length === 0) {
        await tx.notificationChannel.updateMany({
            where: {
                userId,
                isDefault: true,
            },
            data: {
                isDefault: false,
            },
        });
        return;
    }

    const selectedDefault =
        (preferredChannelId ? activeChannels.find((channel) => channel.id === preferredChannelId) : undefined) ??
        activeChannels.find((channel) => channel.isDefault) ??
        activeChannels[0];

    await tx.notificationChannel.updateMany({
        where: {
            userId,
            isDefault: true,
            id: {
                not: selectedDefault.id,
            },
        },
        data: {
            isDefault: false,
        },
    });

    await tx.notificationChannel.update({
        where: {
            id: selectedDefault.id,
        },
        data: {
            isDefault: true,
        },
    });
};

export const listNotificationChannels = async (userId: string): Promise<NotificationChannel[]> => {
    const channels = await prisma.notificationChannel.findMany({
        where: { userId },
        orderBy: {
            createdAt: "desc",
        },
    });

    return channels.map(toNotificationChannel);
};

export const createNotificationChannel = async (
    userId: string,
    input: NotificationChannelCreateRequest,
): Promise<NotificationChannel> => {
    ensureSupportedChannelType(input.channelType);

    try {
        return await prisma.$transaction(async (tx) => {
            const destination = normalizeEmailDestination(input.destination);
            let isActive = input.isActive ?? true;
            let isDefault = input.isDefault ?? false;

            if (isDefault && !isActive) {
                isActive = true;
            }

            const activeEmailCount = await tx.notificationChannel.count({
                where: {
                    userId,
                    channelType: EMAIL_CHANNEL,
                    isActive: true,
                },
            });

            if (activeEmailCount === 0 && isActive) {
                isDefault = true;
            }

            const created = await tx.notificationChannel.create({
                data: {
                    userId,
                    channelType: EMAIL_CHANNEL,
                    destination,
                    isDefault,
                    isActive,
                },
            });

            if (created.isDefault) {
                await tx.notificationChannel.updateMany({
                    where: {
                        userId,
                        channelType: EMAIL_CHANNEL,
                        isDefault: true,
                        id: {
                            not: created.id,
                        },
                    },
                    data: {
                        isDefault: false,
                    },
                });
            }

            await ensureSingleDefaultInvariant(tx, userId, created.isActive ? created.id : undefined);

            const refreshed = await tx.notificationChannel.findUniqueOrThrow({
                where: { id: created.id },
            });

            return toNotificationChannel(refreshed);
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new AppError(409, "conflict", "Notification channel with this destination already exists");
        }

        throw error;
    }
};

export const updateNotificationChannel = async (
    userId: string,
    channelId: string,
    input: NotificationChannelUpdateRequest,
): Promise<NotificationChannel> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const existing = await tx.notificationChannel.findFirst({
                where: {
                    id: channelId,
                    userId,
                },
            });

            if (!existing) {
                throw new AppError(404, "not_found", "Notification channel not found");
            }

            const destination =
                input.destination !== undefined
                    ? existing.channelType === EMAIL_CHANNEL
                        ? normalizeEmailDestination(input.destination)
                        : input.destination.trim()
                    : existing.destination;

            let isActive = input.isActive ?? existing.isActive;
            const isDefault = input.isDefault ?? existing.isDefault;

            if (isDefault && !isActive) {
                isActive = true;
            }

            const updated = await tx.notificationChannel.update({
                where: {
                    id: channelId,
                },
                data: {
                    destination,
                    isActive,
                    isDefault,
                },
            });

            if (updated.isDefault) {
                await tx.notificationChannel.updateMany({
                    where: {
                        userId,
                        isDefault: true,
                        id: {
                            not: updated.id,
                        },
                    },
                    data: {
                        isDefault: false,
                    },
                });
            }

            await ensureSingleDefaultInvariant(tx, userId, updated.isActive ? updated.id : undefined);

            const refreshed = await tx.notificationChannel.findUniqueOrThrow({
                where: { id: updated.id },
            });

            return toNotificationChannel(refreshed);
        });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new AppError(409, "conflict", "Notification channel with this destination already exists");
        }

        throw error;
    }
};

export const deleteNotificationChannel = async (userId: string, channelId: string): Promise<{ success: true }> => {
    await prisma.$transaction(async (tx) => {
        const existing = await tx.notificationChannel.findFirst({
            where: {
                id: channelId,
                userId,
            },
        });

        if (!existing) {
            throw new AppError(404, "not_found", "Notification channel not found");
        }

        await tx.notificationChannel.update({
            where: {
                id: channelId,
            },
            data: {
                isActive: false,
                isDefault: false,
            },
        });

        await ensureSingleDefaultInvariant(tx, userId);
    });

    return { success: true };
};
