import { Queue } from "bullmq";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { getRedisConnectionOptions } from "../queue/connection";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";
import { enqueueDueCategories } from "./enqueue-due-categories";
import type { ScrapeCategoryJobData } from "../queue/job-types";

const describeIfRedis = process.env.RUN_REDIS_TESTS === "1" ? describe : describe.skip;

useTestDatabase();

describeIfRedis("enqueueDueCategories", () => {
    let queue: Queue<ScrapeCategoryJobData>;

    beforeEach(async () => {
        const queueName = `test-scheduler-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        queue = new Queue<ScrapeCategoryJobData>(queueName, {
            connection: getRedisConnectionOptions(),
        });

        await queue.waitUntilReady();
    });

    afterEach(async () => {
        await queue.obliterate({ force: true });
        await queue.close();
    });

    it("enqueues due categories once and skips duplicate tick", async () => {
        const { user } = await createUser({ email: "sched1@example.com" });
        const dueNow = new Date();

        const category = await prisma.category.create({
            data: {
                slug: "scheduler-due",
                nameEt: "Scheduler Due",
                nameEn: "Scheduler Due",
                isActive: true,
                scrapeIntervalHours: 12,
                nextRunAt: dueNow,
            },
        });

        await prisma.userSubscription.create({
            data: {
                userId: user.id,
                categoryId: category.id,
                isActive: true,
            },
        });

        const firstTick = await enqueueDueCategories({ now: dueNow, queue });
        const secondTick = await enqueueDueCategories({ now: dueNow, queue });
        const counts = await queue.getJobCounts("waiting", "active", "delayed");

        expect(firstTick.checkedCount).toBe(1);
        expect(firstTick.enqueuedCount).toBe(1);
        expect(firstTick.skippedExistingCount).toBe(0);

        expect(secondTick.checkedCount).toBe(1);
        expect(secondTick.enqueuedCount).toBe(0);
        expect(secondTick.skippedExistingCount).toBe(1);

        expect(counts.waiting + counts.active + counts.delayed).toBe(1);
    });

    it("does not enqueue categories with no active subscribers or inactive categories", async () => {
        const { user } = await createUser({ email: "sched2@example.com" });
        const dueNow = new Date();

        const inactiveCategory = await prisma.category.create({
            data: {
                slug: "scheduler-inactive",
                nameEt: "Inactive",
                nameEn: "Inactive",
                isActive: false,
                scrapeIntervalHours: 12,
                nextRunAt: dueNow,
            },
        });

        await prisma.userSubscription.create({
            data: {
                userId: user.id,
                categoryId: inactiveCategory.id,
                isActive: true,
            },
        });

        await prisma.category.create({
            data: {
                slug: "scheduler-no-subs",
                nameEt: "No Subs",
                nameEn: "No Subs",
                isActive: true,
                scrapeIntervalHours: 12,
                nextRunAt: dueNow,
            },
        });

        const tick = await enqueueDueCategories({ now: dueNow, queue });
        const counts = await queue.getJobCounts("waiting", "active", "delayed");

        expect(tick.checkedCount).toBe(0);
        expect(tick.enqueuedCount).toBe(0);
        expect(tick.failedCount).toBe(0);
        expect(counts.waiting + counts.active + counts.delayed).toBe(0);
    });
});
