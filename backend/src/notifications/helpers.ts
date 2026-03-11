import { NotificationDeliveryStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { DigestRecipientPayload, ImmediateDeliveryPayload, ReportChangeItem } from "./types";

const buildReportChangeItems = (
    items: {
        id: string;
        changeType: ReportChangeItem["changeType"];
        oldPrice: ReportChangeItem["oldPrice"];
        newPrice: ReportChangeItem["newPrice"];
        oldStockStatus: ReportChangeItem["oldStockStatus"];
        newStockStatus: ReportChangeItem["newStockStatus"];
        isWatchedAtSend?: boolean;
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
        isWatchedAtSend: item.isWatchedAtSend,
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

const loadDeliveryItemSnapshots = async (notificationDeliveryId: string) => {
    const deliveryItems = await prisma.notificationDeliveryItem.findMany({
        where: {
            notificationDeliveryId,
        },
        include: {
            changeItem: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            externalUrl: true,
                            imageUrl: true,
                            isPreorder: true,
                            preorderEta: true,
                            preorderDetectedFrom: true,
                        },
                    },
                },
            },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return buildReportChangeItems(
        deliveryItems.map((item) => ({
            id: item.changeItem.id,
            changeType: item.changeItem.changeType,
            oldPrice: item.changeItem.oldPrice,
            newPrice: item.changeItem.newPrice,
            oldStockStatus: item.changeItem.oldStockStatus,
            newStockStatus: item.changeItem.newStockStatus,
            isWatchedAtSend: item.isWatchedAtSend,
            product: item.changeItem.product,
        })),
    );
};

const getOrCreateDeliveryItemSnapshots = async (
    notificationDeliveryId: string,
    userId: string,
    changeItems: {
        id: string;
        changeType: ReportChangeItem["changeType"];
        oldPrice: ReportChangeItem["oldPrice"];
        newPrice: ReportChangeItem["newPrice"];
        oldStockStatus: ReportChangeItem["oldStockStatus"];
        newStockStatus: ReportChangeItem["newStockStatus"];
        product: ReportChangeItem["product"];
    }[],
) => {
    const existing = await loadDeliveryItemSnapshots(notificationDeliveryId);
    if (existing.length > 0) {
        return existing;
    }

    const productIds = Array.from(new Set(changeItems.map((item) => item.product.id)));
    const watchedProducts = await prisma.userTrackedProduct.findMany({
        where: {
            userId,
            isActive: true,
            productId: {
                in: productIds,
            },
        },
        select: {
            productId: true,
        },
    });
    const watchedProductIdSet = new Set(watchedProducts.map((item) => item.productId));

    if (changeItems.length > 0) {
        await prisma.notificationDeliveryItem.createMany({
            data: changeItems.map((item) => ({
                notificationDeliveryId,
                changeItemId: item.id,
                isWatchedAtSend: watchedProductIdSet.has(item.product.id),
            })),
            skipDuplicates: true,
        });
    }

    const snapshots = await loadDeliveryItemSnapshots(notificationDeliveryId);
    if (snapshots.length > 0) {
        return snapshots;
    }

    return buildReportChangeItems(
        changeItems.map((item) => ({
            ...item,
            isWatchedAtSend: watchedProductIdSet.has(item.product.id),
        })),
    );
};

export const getImmediateDeliveryPayloads = async (changeReportId: string): Promise<ImmediateDeliveryPayload[]> => {
    const deliveries = await prisma.notificationDelivery.findMany({
        where: {
            changeReportId,
            status: NotificationDeliveryStatus.PENDING,
            changeReport: {
                scrapeRun: {
                    isSystemNoise: false,
                },
            },
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
                                    isPreorder: true,
                                    preorderEta: true,
                                    preorderDetectedFrom: true,
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

    const payloads = await Promise.all(
        deliveries.map(async (delivery) => ({
            delivery: {
                id: delivery.id,
                status: delivery.status,
            },
            user: delivery.user,
            channel: delivery.notificationChannel,
            report: toReportPayload(delivery.changeReport),
            changeItems: await getOrCreateDeliveryItemSnapshots(
                delivery.id,
                delivery.user.id,
                buildReportChangeItems(delivery.changeReport.changeItems),
            ),
        })),
    );

    return payloads;
};

export const getDigestRecipientPayloads = async (now: Date): Promise<DigestRecipientPayload[]> => {
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    const deliveries = await prisma.notificationDelivery.findMany({
        where: {
            status: NotificationDeliveryStatus.PENDING,
            changeReport: {
                scrapeRun: {
                    isSystemNoise: false,
                },
            },
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
                                    isPreorder: true,
                                    preorderEta: true,
                                    preorderDetectedFrom: true,
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
            changeItems: await getOrCreateDeliveryItemSnapshots(
                delivery.id,
                delivery.user.id,
                buildReportChangeItems(delivery.changeReport.changeItems),
            ),
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
