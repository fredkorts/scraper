import { beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../lib/prisma";
import { assertDbBackedTestEnvironment } from "./database-target";

export const useTestDatabase = () => {
    beforeAll(async () => {
        assertDbBackedTestEnvironment();
        await prisma.$connect();
    });

    beforeEach(async () => {
        assertDbBackedTestEnvironment();
        await prisma.$executeRawUnsafe(`
            TRUNCATE TABLE
                notification_delivery_items,
                notification_deliveries,
                notification_channels,
                refresh_tokens,
                product_snapshots,
                product_categories,
                products,
                user_tracked_products,
                scrape_runs,
                categories,
                user_subscriptions,
                users
            RESTART IDENTITY CASCADE
        `);
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });
};
