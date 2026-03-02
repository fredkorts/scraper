import { Queue, QueueEvents, type Worker } from "bullmq";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { getRedisConnectionOptions } from "../queue/connection";
import {
    SCRAPE_CATEGORY_JOB_NAME,
    type ScrapeCategoryJobData,
    type ScrapeCategoryJobResult,
} from "../queue/job-types";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";
import { createScrapeWorker } from "./scrape-worker";

const describeIfRedis = process.env.RUN_REDIS_TESTS === "1" ? describe : describe.skip;

useTestDatabase();

describeIfRedis("scrape worker", () => {
    let queue: Queue<ScrapeCategoryJobData> | null = null;
    let queueEvents: QueueEvents | null = null;
    let worker: Worker<ScrapeCategoryJobData, ScrapeCategoryJobResult> | null = null;

    afterEach(async () => {
        if (worker) {
            await worker.close();
            worker = null;
        }

        if (queueEvents) {
            await queueEvents.close();
            queueEvents = null;
        }

        if (queue) {
            await queue.obliterate({ force: true });
            await queue.close();
            queue = null;
        }
    });

    it("updates next_run_at after successful scrape job", async () => {
        const queueName = `test-worker-success-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { user } = await createUser({ email: "worker-success@example.com" });

        const category = await prisma.category.create({
            data: {
                slug: "worker-success-category",
                nameEt: "Worker Success",
                nameEn: "Worker Success",
                isActive: true,
                scrapeIntervalHours: 6,
                nextRunAt: null,
            },
        });

        await prisma.userSubscription.create({
            data: {
                userId: user.id,
                categoryId: category.id,
                isActive: true,
            },
        });

        worker = createScrapeWorker({
            queueName,
            concurrency: 1,
            scrapeCategoryHandler: async () => {
                return {
                    scrapeRunId: "run-success-1",
                    status: "completed",
                    totalProducts: 0,
                    newProducts: 0,
                    priceChanges: 0,
                    soldOut: 0,
                    backInStock: 0,
                    pagesScraped: 0,
                    parserWarnings: [],
                    missingProductUrls: [],
                };
            },
        });

        await worker.waitUntilReady();

        queue = new Queue<ScrapeCategoryJobData>(queueName, {
            connection: getRedisConnectionOptions(),
        });

        queueEvents = new QueueEvents(queueName, {
            connection: getRedisConnectionOptions(),
        });

        await queue.waitUntilReady();
        await queueEvents.waitUntilReady();

        const job = await queue.add(
            SCRAPE_CATEGORY_JOB_NAME,
            {
                categoryId: category.id,
                trigger: "scheduler",
                requestedAt: new Date().toISOString(),
            },
            {
                attempts: 1,
                removeOnComplete: false,
                removeOnFail: false,
            },
        );

        const result = await job.waitUntilFinished(queueEvents);

        expect(result.status).toBe("completed");

        const refreshedCategory = await prisma.category.findUniqueOrThrow({
            where: { id: category.id },
        });

        expect(refreshedCategory.nextRunAt).not.toBeNull();
    });

    it("advances next_run_at only after final failed attempt", async () => {
        const queueName = `test-worker-fail-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { user } = await createUser({ email: "worker-fail@example.com" });

        const category = await prisma.category.create({
            data: {
                slug: "worker-fail-category",
                nameEt: "Worker Fail",
                nameEn: "Worker Fail",
                isActive: true,
                scrapeIntervalHours: 12,
                nextRunAt: null,
            },
        });

        await prisma.userSubscription.create({
            data: {
                userId: user.id,
                categoryId: category.id,
                isActive: true,
            },
        });

        worker = createScrapeWorker({
            queueName,
            concurrency: 1,
            scrapeCategoryHandler: async () => {
                throw new Error("simulated scrape failure");
            },
        });

        await worker.waitUntilReady();

        const firstFailureCheck = new Promise<void>((resolve, reject) => {
            worker?.once("failed", async (job) => {
                if (!job || job.attemptsMade !== 1) {
                    return;
                }

                try {
                    const refreshedCategory = await prisma.category.findUniqueOrThrow({
                        where: { id: category.id },
                    });

                    expect(refreshedCategory.nextRunAt).toBeNull();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });

        queue = new Queue<ScrapeCategoryJobData>(queueName, {
            connection: getRedisConnectionOptions(),
        });

        queueEvents = new QueueEvents(queueName, {
            connection: getRedisConnectionOptions(),
        });

        await queue.waitUntilReady();
        await queueEvents.waitUntilReady();

        const job = await queue.add(
            SCRAPE_CATEGORY_JOB_NAME,
            {
                categoryId: category.id,
                trigger: "scheduler",
                requestedAt: new Date().toISOString(),
            },
            {
                attempts: 2,
                backoff: {
                    type: "fixed",
                    delay: 25,
                },
                removeOnComplete: false,
                removeOnFail: false,
            },
        );

        await firstFailureCheck;
        await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow("simulated scrape failure");

        const refreshedCategory = await prisma.category.findUniqueOrThrow({
            where: { id: category.id },
        });

        expect(refreshedCategory.nextRunAt).not.toBeNull();
    });
});
