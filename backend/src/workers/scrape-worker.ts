import "dotenv/config";
import { Worker, type Job } from "bullmq";
import type { ScrapeCategoryResult } from "../scraper/types";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { getRedisConnectionOptions } from "../queue/connection";
import {
    SCRAPE_CATEGORY_JOB_NAME,
    SCRAPE_QUEUE_NAME,
    type ScrapeCategoryJobData,
    type ScrapeCategoryJobResult,
} from "../queue/job-types";
import { scrapeCategory } from "../scraper/run";

type ScrapeCategoryHandler = (categoryId: string) => Promise<ScrapeCategoryResult>;

interface CreateScrapeWorkerOptions {
    queueName?: string;
    concurrency?: number;
    scrapeCategoryHandler?: ScrapeCategoryHandler;
}

const getNextRunAt = (now: Date, scrapeIntervalHours: number): Date => {
    return new Date(now.getTime() + scrapeIntervalHours * 60 * 60 * 1000);
};

const loadCategorySchedule = async (categoryId: string) => {
    return prisma.category.findUnique({
        where: { id: categoryId },
        select: {
            id: true,
            isActive: true,
            scrapeIntervalHours: true,
            subscriptions: {
                where: {
                    isActive: true,
                    user: {
                        isActive: true,
                    },
                },
                select: {
                    id: true,
                },
                take: 1,
            },
        },
    });
};

const getConfiguredAttempts = (job: Job<ScrapeCategoryJobData>): number => {
    if (typeof job.opts.attempts === "number" && Number.isFinite(job.opts.attempts)) {
        return Math.max(1, job.opts.attempts);
    }

    return 1;
};

export const updateCategoryNextRunAt = async (
    categoryId: string,
    now: Date = new Date(),
): Promise<Date | null> => {
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: {
            scrapeIntervalHours: true,
        },
    });

    if (!category) {
        return null;
    }

    const nextRunAt = getNextRunAt(now, category.scrapeIntervalHours);
    await prisma.category.update({
        where: { id: categoryId },
        data: {
            nextRunAt,
        },
    });

    return nextRunAt;
};

const processScrapeCategoryJob =
    (handler: ScrapeCategoryHandler) => async (job: Job<ScrapeCategoryJobData>) => {
        if (job.name !== SCRAPE_CATEGORY_JOB_NAME) {
            throw new Error(`Unsupported job name: ${job.name}`);
        }

        const category = await loadCategorySchedule(job.data.categoryId);
        if (!category) {
            throw new Error(`Category not found for scrape job: ${job.data.categoryId}`);
        }

        if (!category.isActive || category.subscriptions.length === 0) {
            const nextRunAt = await updateCategoryNextRunAt(category.id);
            return {
                status: "skipped",
                reason: "category_inactive_or_has_no_active_subscribers",
                nextRunAt: nextRunAt?.toISOString() ?? new Date().toISOString(),
            } satisfies ScrapeCategoryJobResult;
        }

        try {
            const result = await handler(category.id);
            const nextRunAt = await updateCategoryNextRunAt(category.id);

            return {
                status: "completed",
                scrapeRunId: result.scrapeRunId,
                nextRunAt: nextRunAt?.toISOString() ?? new Date().toISOString(),
            } satisfies ScrapeCategoryJobResult;
        } catch (error) {
            const attempts = getConfiguredAttempts(job);
            const isFinalAttempt = job.attemptsMade + 1 >= attempts;

            if (isFinalAttempt) {
                const nextRunAt = await updateCategoryNextRunAt(category.id);
                if (nextRunAt) {
                    console.log(
                        `[worker] advanced next_run_at after final failure for ${job.data.categoryId} to ${nextRunAt.toISOString()}`,
                    );
                }
            }

            throw error;
        }
    };

export const createScrapeWorker = (options: CreateScrapeWorkerOptions = {}) => {
    const worker = new Worker<ScrapeCategoryJobData, ScrapeCategoryJobResult>(
        options.queueName ?? SCRAPE_QUEUE_NAME,
        processScrapeCategoryJob(options.scrapeCategoryHandler ?? scrapeCategory),
        {
            connection: getRedisConnectionOptions(),
            concurrency: options.concurrency ?? config.SCRAPE_WORKER_CONCURRENCY,
        },
    );

    worker.on("completed", (job, result) => {
        console.log(
            `[worker] completed job ${job.id} for category ${job.data.categoryId}: ${result.status}`,
        );
    });

    worker.on("failed", (job, error) => {
        if (!job) {
            console.error("[worker] failed event received without job context", error);
            return;
        }

        const attempts = getConfiguredAttempts(job);

        console.error(
            `[worker] failed job ${job.id} for category ${job.data.categoryId} (attempt ${job.attemptsMade}/${attempts})`,
            error,
        );
    });

    return worker;
};

const runWorker = async (): Promise<void> => {
    await prisma.$connect();

    const worker = createScrapeWorker();
    await worker.waitUntilReady();
    console.log(`[worker] started queue ${SCRAPE_QUEUE_NAME}`);

    const shutdown = async (signal: NodeJS.Signals) => {
        console.log(`[worker] received ${signal}, shutting down`);
        await worker.close();
        await prisma.$disconnect();
        process.exit(0);
    };

    process.on("SIGINT", () => {
        void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
        void shutdown("SIGTERM");
    });
};

if (import.meta.url === `file://${process.argv[1]}`) {
    runWorker().catch(async (error) => {
        console.error("[worker] startup failed", error);
        await prisma.$disconnect();
        process.exit(1);
    });
}
