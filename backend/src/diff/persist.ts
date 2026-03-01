import { NotificationChannelType, NotificationDeliveryStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { DeliveryRecipient, DiffDetectionResult } from "./types";

interface PersistDiffResultInput {
    scrapeRunId: string;
    categoryId: string;
    detection: DiffDetectionResult;
}

const loadRecipients = async (categoryId: string): Promise<DeliveryRecipient[]> => {
    const subscriptions = await prisma.userSubscription.findMany({
        where: {
            categoryId,
            isActive: true,
            user: {
                isActive: true,
            },
        },
        select: {
            userId: true,
            user: {
                select: {
                    role: true,
                    notificationChannels: {
                        where: {
                            isActive: true,
                            isDefault: true,
                            channelType: NotificationChannelType.EMAIL,
                        },
                        select: {
                            id: true,
                        },
                    },
                },
            },
        },
    });

    return subscriptions.flatMap((subscription) =>
        subscription.user.notificationChannels.map((channel) => ({
            userId: subscription.userId,
            role: subscription.user.role,
            notificationChannelId: channel.id,
        })),
    );
};

export const persistDiffResults = async (input: PersistDiffResultInput) => {
    const recipients = input.detection.changeItems.length > 0 ? await loadRecipients(input.categoryId) : [];

    return prisma.$transaction(async (tx) => {
        await tx.scrapeRun.update({
            where: { id: input.scrapeRunId },
            data: {
                soldOut: input.detection.soldOutCount,
                backInStock: input.detection.backInStockCount,
            },
        });

        if (input.detection.changeItems.length === 0) {
            return {
                changeReportId: undefined,
                totalChanges: 0,
                deliveryCount: 0,
                soldOutCount: input.detection.soldOutCount,
                backInStockCount: input.detection.backInStockCount,
            };
        }

        const changeReport = await tx.changeReport.create({
            data: {
                scrapeRunId: input.scrapeRunId,
                totalChanges: input.detection.changeItems.length,
            },
        });

        await tx.changeItem.createMany({
            data: input.detection.changeItems.map((item) => ({
                changeReportId: changeReport.id,
                productId: item.productId,
                changeType: item.changeType,
                oldPrice: item.oldPrice,
                newPrice: item.newPrice,
                oldStockStatus: item.oldStockStatus,
                newStockStatus: item.newStockStatus,
            })),
        });

        if (recipients.length > 0) {
            await tx.notificationDelivery.createMany({
                data: recipients.map((recipient) => ({
                    changeReportId: changeReport.id,
                    userId: recipient.userId,
                    notificationChannelId: recipient.notificationChannelId,
                    status: NotificationDeliveryStatus.PENDING,
                })),
                skipDuplicates: true,
            });
        }

        return {
            changeReportId: changeReport.id,
            totalChanges: input.detection.changeItems.length,
            deliveryCount: recipients.length,
            soldOutCount: input.detection.soldOutCount,
            backInStockCount: input.detection.backInStockCount,
        };
    });
};
