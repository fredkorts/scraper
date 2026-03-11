import {
    ChangeType,
    NotificationChannelType,
    NotificationDeliveryStatus,
    ScrapeRunStatus,
    UserRole,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { getImmediateDeliveryPayloads } from "./helpers";

useTestDatabase();

const createFixture = async () => {
    const user = await prisma.user.create({
        data: {
            email: "snapshot-user@example.com",
            passwordHash: "hash",
            name: "Snapshot User",
            role: UserRole.PAID,
            isActive: true,
        },
    });
    const channel = await prisma.notificationChannel.create({
        data: {
            userId: user.id,
            channelType: NotificationChannelType.EMAIL,
            destination: user.email,
            isDefault: true,
            isActive: true,
        },
    });
    const category = await prisma.category.create({
        data: {
            slug: "snapshot-category",
            nameEt: "Snapshot Category",
            nameEn: "Snapshot Category",
        },
    });
    const run = await prisma.scrapeRun.create({
        data: {
            categoryId: category.id,
            status: ScrapeRunStatus.COMPLETED,
            startedAt: new Date("2026-03-01T10:00:00.000Z"),
            completedAt: new Date("2026-03-01T10:05:00.000Z"),
        },
    });
    const product = await prisma.product.create({
        data: {
            externalUrl: "https://mabrik.ee/toode/snapshot-product",
            name: "Snapshot Product",
            imageUrl: "https://mabrik.ee/images/snapshot-product.jpg",
            currentPrice: "9.99",
            inStock: true,
        },
    });
    const report = await prisma.changeReport.create({
        data: {
            scrapeRunId: run.id,
            totalChanges: 1,
        },
    });
    await prisma.changeItem.create({
        data: {
            changeReportId: report.id,
            productId: product.id,
            changeType: ChangeType.NEW_PRODUCT,
            newPrice: "9.99",
            newStockStatus: true,
        },
    });
    const delivery = await prisma.notificationDelivery.create({
        data: {
            changeReportId: report.id,
            userId: user.id,
            notificationChannelId: channel.id,
            status: NotificationDeliveryStatus.PENDING,
        },
    });
    await prisma.userTrackedProduct.create({
        data: {
            userId: user.id,
            productId: product.id,
            isActive: true,
        },
    });

    return { user, report, delivery, product };
};

describe("notification delivery item snapshots", () => {
    it("reuses existing watched snapshot metadata across subsequent payload builds", async () => {
        const { user, report, delivery, product } = await createFixture();

        const firstPayloads = await getImmediateDeliveryPayloads(report.id);
        expect(firstPayloads).toHaveLength(1);
        expect(firstPayloads[0]?.changeItems[0]?.isWatchedAtSend).toBe(true);

        await prisma.userTrackedProduct.updateMany({
            where: {
                userId: user.id,
                productId: product.id,
                isActive: true,
            },
            data: {
                isActive: false,
                deactivatedReason: "manual_unwatch",
            },
        });

        const secondPayloads = await getImmediateDeliveryPayloads(report.id);
        expect(secondPayloads).toHaveLength(1);
        expect(secondPayloads[0]?.changeItems[0]?.isWatchedAtSend).toBe(true);

        const snapshotRows = await prisma.notificationDeliveryItem.findMany({
            where: {
                notificationDeliveryId: delivery.id,
            },
        });
        expect(snapshotRows).toHaveLength(1);
        expect(snapshotRows[0]?.isWatchedAtSend).toBe(true);
    });
});
