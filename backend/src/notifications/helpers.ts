import {
    NotificationDeliveryStatus,
    UserRole,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import type {
    DigestRecipientPayload,
    ImmediateDeliveryPayload,
    ReportChangeItem,
    ReportEmailPayload,
} from "./types";

const buildReportChangeItems = (
    items: {
        id: string;
        changeType: ReportChangeItem["changeType"];
        oldPrice: ReportChangeItem["oldPrice"];
        newPrice: ReportChangeItem["newPrice"];
        oldStockStatus: ReportChangeItem["oldStockStatus"];
        newStockStatus: ReportChangeItem["newStockStatus"];
        product: ReportChangeItem["product"];
    }[],
): ReportChangeItem[] =>
    items.map((item) => ({
        id: item.id,
        changeType: item.changeType,
        oldPrice: item.oldPrice,
        newPrice: item.newPrice,
        oldStockStatus: item.oldStockStatus,
        newStockStatus: item.newStockStatus,
        product: item.product,
    }));

const toReportPayload = (report: {
    id: string;
    createdAt: Date;
    totalChanges: number;
    scrapeRun: {
        id: string;
        completedAt: Date | null;
        category: {
            id: string;
            nameEt: string;
            slug: string;
        };
    };
}) => ({
    id: report.id,
    createdAt: report.createdAt,
    totalChanges: report.totalChanges,
    scrapeRun: {
        id: report.scrapeRun.id,
        completedAt: report.scrapeRun.completedAt,
        category: report.scrapeRun.category,
    },
});

export const getImmediateDeliveryPayloads = async (
    changeReportId: string,
): Promise<ImmediateDeliveryPayload[]> => {
    const deliveries = await prisma.notificationDelivery.findMany({
        where: {
            changeReportId,
            status: NotificationDeliveryStatus.PENDING,
            user: {
                role: {
                    in: [UserRole.PAID, UserRole.ADMIN],
                },
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                },
            },
            notificationChannel: {
                select: {
                    id: true,
                    destination: true,
                    isActive: true,
                    channelType: true,
                },
            },
            changeReport: {
                include: {
                    scrapeRun: {
                        select: {
                            id: true,
                            completedAt: true,
                            category: {
                                select: {
                                    id: true,
                                    nameEt: true,
                                    slug: true,
                                },
                            },
                        },
                    },
                    changeItems: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    externalUrl: true,
                                    imageUrl: true,
                                },
                            },
                        },
                        orderBy: {
                            id: "asc",
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    return deliveries.map((delivery) => ({
        delivery: {
            id: delivery.id,
            status: delivery.status,
        },
        user: delivery.user,
        channel: delivery.notificationChannel,
        report: toReportPayload(delivery.changeReport),
        changeItems: buildReportChangeItems(delivery.changeReport.changeItems),
    }));
};

export const getDigestRecipientPayloads = async (now: Date): Promise<DigestRecipientPayload[]> => {
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    const deliveries = await prisma.notificationDelivery.findMany({
        where: {
            status: NotificationDeliveryStatus.PENDING,
            user: {
                isActive: true,
                OR: [{ lastDigestSentAt: null }, { lastDigestSentAt: { lte: sixHoursAgo } }],
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    lastDigestSentAt: true,
                    isActive: true,
                },
            },
            notificationChannel: {
                select: {
                    id: true,
                    destination: true,
                    isActive: true,
                    channelType: true,
                },
            },
            changeReport: {
                include: {
                    scrapeRun: {
                        select: {
                            id: true,
                            completedAt: true,
                            category: {
                                select: {
                                    id: true,
                                    nameEt: true,
                                    slug: true,
                                },
                            },
                        },
                    },
                    changeItems: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    externalUrl: true,
                                    imageUrl: true,
                                },
                            },
                        },
                        orderBy: {
                            id: "asc",
                        },
                    },
                },
            },
        },
        orderBy: [{ userId: "asc" }, { createdAt: "asc" }],
    });

    const recipients = new Map<string, DigestRecipientPayload>();

    for (const delivery of deliveries) {
        const existing = recipients.get(delivery.userId);
        const payloadDelivery = {
            deliveryId: delivery.id,
            report: toReportPayload(delivery.changeReport),
            changeItems: buildReportChangeItems(delivery.changeReport.changeItems),
        };

        if (existing) {
            existing.deliveries.push(payloadDelivery);
            continue;
        }

        recipients.set(delivery.userId, {
            user: delivery.user,
            channel: delivery.notificationChannel,
            deliveries: [payloadDelivery],
        });
    }

    return [...recipients.values()];
};

export const markDeliverySent = async (deliveryId: string) => {
    await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
            status: NotificationDeliveryStatus.SENT,
            sentAt: new Date(),
            errorMessage: null,
        },
    });
};

export const markDeliveryFailed = async (deliveryId: string, message: string) => {
    await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
            status: NotificationDeliveryStatus.FAILED,
            errorMessage: message,
            sentAt: null,
        },
    });
};

export const markDeliverySkipped = async (deliveryId: string, message: string) => {
    await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
            status: NotificationDeliveryStatus.SKIPPED,
            errorMessage: message,
            sentAt: null,
        },
    });
};

export const markDigestDeliveriesSent = async (userId: string, deliveryIds: string[], sentAt: Date) => {
    await prisma.$transaction([
        prisma.notificationDelivery.updateMany({
            where: {
                id: {
                    in: deliveryIds,
                },
            },
            data: {
                status: NotificationDeliveryStatus.SENT,
                sentAt,
                errorMessage: null,
            },
        }),
        prisma.user.update({
            where: { id: userId },
            data: {
                lastDigestSentAt: sentAt,
            },
        }),
    ]);
};
