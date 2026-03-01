import { ChangeType, NotificationChannelType, NotificationDeliveryStatus, ScrapeRunStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { createUser } from "../test/factories";
import { useTestDatabase } from "../test/db";
import { runDiffEngine } from "./run";

useTestDatabase();

const createCategory = async (slug: string) =>
    prisma.category.create({
        data: {
            slug,
            nameEt: slug,
            nameEn: slug,
            isActive: true,
            scrapeIntervalHours: 12,
        },
    });

const createCompletedRun = async (
    categoryId: string,
    startedAt: Date,
    completedAt: Date,
) =>
    prisma.scrapeRun.create({
        data: {
            categoryId,
            status: ScrapeRunStatus.COMPLETED,
            startedAt,
            completedAt,
            pagesScraped: 1,
        },
    });

const createProduct = async (options: {
    externalUrl: string;
    name: string;
    currentPrice: string;
    inStock: boolean;
    firstSeenAt: Date;
}) =>
    prisma.product.create({
        data: {
            externalUrl: options.externalUrl,
            name: options.name,
            imageUrl: `https://mabrik.ee/images/${options.name}.jpg`,
            currentPrice: options.currentPrice,
            originalPrice: null,
            inStock: options.inStock,
            firstSeenAt: options.firstSeenAt,
            lastSeenAt: options.firstSeenAt,
        },
    });

const createSnapshot = async (options: {
    scrapeRunId: string;
    productId: string;
    name: string;
    price: string;
    inStock: boolean;
    scrapedAt: Date;
}) =>
    prisma.productSnapshot.create({
        data: {
            scrapeRunId: options.scrapeRunId,
            productId: options.productId,
            name: options.name,
            price: options.price,
            originalPrice: null,
            inStock: options.inStock,
            imageUrl: `https://mabrik.ee/images/${options.name}.jpg`,
            scrapedAt: options.scrapedAt,
        },
    });

const subscribeUserWithDefaultEmail = async (userId: string, categoryId: string) => {
    const channel = await prisma.notificationChannel.create({
        data: {
            userId,
            channelType: NotificationChannelType.EMAIL,
            destination: `${userId}@example.com`,
            isDefault: true,
            isActive: true,
        },
    });

    await prisma.userSubscription.create({
        data: {
            userId,
            categoryId,
            isActive: true,
        },
    });

    return channel;
};

describe("runDiffEngine", () => {
    it("creates a change report and pending delivery for a first-run globally new product", async () => {
        const category = await createCategory("lauamangud");
        const { user } = await createUser();
        const channel = await subscribeUserWithDefaultEmail(user.id, category.id);

        const startedAt = new Date("2026-03-01T10:00:00.000Z");
        const completedAt = new Date("2026-03-01T10:05:00.000Z");
        const scrapeRun = await createCompletedRun(category.id, startedAt, completedAt);
        const product = await createProduct({
            externalUrl: "https://mabrik.ee/toode/new-game",
            name: "new-game",
            currentPrice: "19.99",
            inStock: true,
            firstSeenAt: new Date("2026-03-01T10:02:00.000Z"),
        });

        await createSnapshot({
            scrapeRunId: scrapeRun.id,
            productId: product.id,
            name: product.name,
            price: "19.99",
            inStock: true,
            scrapedAt: new Date("2026-03-01T10:02:00.000Z"),
        });

        const result = await runDiffEngine(scrapeRun.id);

        const report = await prisma.changeReport.findUnique({
            where: { scrapeRunId: scrapeRun.id },
            include: { changeItems: true, deliveries: true },
        });

        expect(result.reusedExistingReport).toBe(false);
        expect(result.totalChanges).toBe(1);
        expect(report?.changeItems).toHaveLength(1);
        expect(report?.changeItems[0]?.changeType).toBe(ChangeType.NEW_PRODUCT);
        expect(report?.deliveries).toHaveLength(1);
        expect(report?.deliveries[0]).toMatchObject({
            userId: user.id,
            notificationChannelId: channel.id,
            status: NotificationDeliveryStatus.PENDING,
        });
    });

    it("creates price increase and sold out change items when explicit historical data exists", async () => {
        const category = await createCategory("strategy");
        const { user } = await createUser({ email: "paid@example.com" });
        await prisma.user.update({
            where: { id: user.id },
            data: { role: "PAID" },
        });
        await subscribeUserWithDefaultEmail(user.id, category.id);

        const previousRun = await createCompletedRun(
            category.id,
            new Date("2026-02-28T10:00:00.000Z"),
            new Date("2026-02-28T10:05:00.000Z"),
        );
        const currentRun = await createCompletedRun(
            category.id,
            new Date("2026-03-01T10:00:00.000Z"),
            new Date("2026-03-01T10:05:00.000Z"),
        );

        const product = await createProduct({
            externalUrl: "https://mabrik.ee/toode/expensive-game",
            name: "expensive-game",
            currentPrice: "14.99",
            inStock: false,
            firstSeenAt: new Date("2026-02-20T10:00:00.000Z"),
        });

        await createSnapshot({
            scrapeRunId: previousRun.id,
            productId: product.id,
            name: product.name,
            price: "12.99",
            inStock: true,
            scrapedAt: new Date("2026-02-28T10:03:00.000Z"),
        });

        await createSnapshot({
            scrapeRunId: currentRun.id,
            productId: product.id,
            name: product.name,
            price: "14.99",
            inStock: false,
            scrapedAt: new Date("2026-03-01T10:03:00.000Z"),
        });

        const result = await runDiffEngine(currentRun.id);
        const items = await prisma.changeItem.findMany({
            where: { changeReport: { scrapeRunId: currentRun.id } },
            orderBy: { changeType: "asc" },
        });
        const refreshedRun = await prisma.scrapeRun.findUniqueOrThrow({
            where: { id: currentRun.id },
        });

        expect(result.totalChanges).toBe(2);
        expect(items.map((item) => item.changeType)).toEqual(
            expect.arrayContaining([ChangeType.PRICE_INCREASE, ChangeType.SOLD_OUT]),
        );
        expect(refreshedRun.soldOut).toBe(1);
        expect(refreshedRun.backInStock).toBe(0);
    });

    it("does not emit new_product for the first category run when the product was first seen earlier elsewhere", async () => {
        const existingCategory = await createCategory("miniatures");
        const targetCategory = await createCategory("card-games");

        const olderRun = await createCompletedRun(
            existingCategory.id,
            new Date("2026-02-20T10:00:00.000Z"),
            new Date("2026-02-20T10:05:00.000Z"),
        );
        const firstTargetRun = await createCompletedRun(
            targetCategory.id,
            new Date("2026-03-01T10:00:00.000Z"),
            new Date("2026-03-01T10:05:00.000Z"),
        );

        const product = await createProduct({
            externalUrl: "https://mabrik.ee/toode/shared-game",
            name: "shared-game",
            currentPrice: "21.99",
            inStock: true,
            firstSeenAt: new Date("2026-02-20T10:02:00.000Z"),
        });

        await createSnapshot({
            scrapeRunId: olderRun.id,
            productId: product.id,
            name: product.name,
            price: "21.99",
            inStock: true,
            scrapedAt: new Date("2026-02-20T10:03:00.000Z"),
        });
        await createSnapshot({
            scrapeRunId: firstTargetRun.id,
            productId: product.id,
            name: product.name,
            price: "21.99",
            inStock: true,
            scrapedAt: new Date("2026-03-01T10:03:00.000Z"),
        });

        const result = await runDiffEngine(firstTargetRun.id);
        const report = await prisma.changeReport.findUnique({
            where: { scrapeRunId: firstTargetRun.id },
        });

        expect(result.totalChanges).toBe(0);
        expect(report).toBeNull();
    });

    it("is idempotent when run a second time for the same scrape run", async () => {
        const category = await createCategory("roleplay");
        const { user } = await createUser({ email: "idempotent@example.com" });
        await subscribeUserWithDefaultEmail(user.id, category.id);

        const scrapeRun = await createCompletedRun(
            category.id,
            new Date("2026-03-01T10:00:00.000Z"),
            new Date("2026-03-01T10:05:00.000Z"),
        );
        const product = await createProduct({
            externalUrl: "https://mabrik.ee/toode/idempotent-game",
            name: "idempotent-game",
            currentPrice: "9.99",
            inStock: true,
            firstSeenAt: new Date("2026-03-01T10:02:00.000Z"),
        });

        await createSnapshot({
            scrapeRunId: scrapeRun.id,
            productId: product.id,
            name: product.name,
            price: "9.99",
            inStock: true,
            scrapedAt: new Date("2026-03-01T10:03:00.000Z"),
        });

        const first = await runDiffEngine(scrapeRun.id);
        const second = await runDiffEngine(scrapeRun.id);

        const reports = await prisma.changeReport.findMany();
        const deliveries = await prisma.notificationDelivery.findMany();

        expect(first.reusedExistingReport).toBe(false);
        expect(second.reusedExistingReport).toBe(true);
        expect(reports).toHaveLength(1);
        expect(deliveries).toHaveLength(1);
    });
});
