import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import type { ScrapeCategoryResult } from "../scraper/types";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { getRedisConnectionOptions } from "../queue/connection";
import {
    SCRAPE_CATEGORY_JOB_NAME,
    SCRAPE_QUEUE_NAME,
    scrapeCategoryJobDataSchema,
    type ScrapeCategoryJobData,
    type ScrapeCategoryJobResult,
} from "../queue/job-types";
import { isScrapeExecutionError } from "../scraper/execution-error";
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

const getRetryBudgetElapsedMs = (job: Job<ScrapeCategoryJobData>): number => {
    const requestedAt = Date.parse(job.data.requestedAt);

    if (!Number.isFinite(requestedAt)) {
        return 0;
    }

    return Math.max(0, Date.now() - requestedAt);
};

const hasRetryBudgetExceeded = (job: Job<ScrapeCategoryJobData>): boolean =>
    getRetryBudgetElapsedMs(job) >= config.SCRAPER_RETRY_BUDGET_MS;

const markRetryBudgetExhausted = async (scrapeRunId: string): Promise<void> => {
    await prisma.scrapeRun.update({
        where: { id: scrapeRunId },
        data: {
            errorMessage: "The scrape retry budget was exhausted before the run could succeed.",
            failureCode: "retry_budget_exhausted",
            failureSummary: "The scrape retry budget was exhausted before the run could succeed.",
            failureIsRetryable: false,
        },
    });
};

export const updateCategoryNextRunAt = async (categoryId: string, now: Date = new Date()): Promise<Date | null> => {
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

const processScrapeCategoryJob = (handler: ScrapeCategoryHandler) => async (job: Job<ScrapeCategoryJobData>) => {
    if (job.name !== SCRAPE_CATEGORY_JOB_NAME) {
        throw new Error(`Unsupported job name: ${job.name}`);
    }

    const parsedJobData = scrapeCategoryJobDataSchema.safeParse(job.data);

    if (!parsedJobData.success) {
        if (config.QUEUE_JOB_SCHEMA_STRICT_MODE) {
            throw new Error("Invalid scrape queue payload");
        }

        logger.warn("worker_invalid_job_payload", {
            jobId: job.id,
            payload: job.data,
        });

        return {
            status: "skipped",
            reason: "invalid_job_payload",
            nextRunAt: new Date().toISOString(),
        } satisfies ScrapeCategoryJobResult;
    }

    const jobData = parsedJobData.data;
    const category = await loadCategorySchedule(jobData.categoryId);
    if (!category) {
        throw new Error(`Category not found for scrape job: ${jobData.categoryId}`);
    }

    if (!category.isActive || (jobData.trigger !== "manual" && category.subscriptions.length === 0)) {
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
        const retryBudgetExceeded = hasRetryBudgetExceeded(job);
        const isNonRetryableScrapeFailure = isScrapeExecutionError(error) && error.failure.isRetryable === false;
        const shouldDiscard = retryBudgetExceeded || isNonRetryableScrapeFailure;

        if (retryBudgetExceeded && isScrapeExecutionError(error)) {
            await markRetryBudgetExhausted(error.scrapeRunId);
        }

        if (shouldDiscard) {
            await job.discard();
        }

        if (isFinalAttempt || shouldDiscard) {
            const nextRunAt = await updateCategoryNextRunAt(category.id);
            if (nextRunAt) {
                logger.info("worker_advanced_next_run_after_failure", {
                    jobId: job.id,
                    categoryId: jobData.categoryId,
                    nextRunAt: nextRunAt.toISOString(),
                    retryBudgetExceeded,
                    isNonRetryableScrapeFailure,
                });
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
        const parsedJobData = scrapeCategoryJobDataSchema.safeParse(job.data);
        const safeJobData = parsedJobData.success ? parsedJobData.data : job.data;

        logger.info("worker_job_completed", {
            jobId: job.id,
            categoryId: safeJobData.categoryId,
            trigger: safeJobData.trigger,
            requestId: safeJobData.requestId,
            status: result.status,
            nextRunAt: result.nextRunAt,
            scrapeRunId: result.scrapeRunId,
        });
    });

    worker.on("failed", (job, error) => {
        if (!job) {
            logger.error("worker_failed_without_job_context", {
                error,
            });
            return;
        }

        const attempts = getConfiguredAttempts(job);
        const parsedJobData = scrapeCategoryJobDataSchema.safeParse(job.data);
        const safeJobData = parsedJobData.success ? parsedJobData.data : job.data;

        logger.error("worker_job_failed", {
            jobId: job.id,
            categoryId: safeJobData.categoryId,
            trigger: safeJobData.trigger,
            requestId: safeJobData.requestId,
            attemptsMade: job.attemptsMade + 1,
            configuredAttempts: attempts,
            retryBudgetElapsedMs: getRetryBudgetElapsedMs(job),
            error,
        });
    });

    return worker;
};

const runWorker = async (): Promise<void> => {
    await prisma.$connect();

    const worker = createScrapeWorker();
    await worker.waitUntilReady();
    logger.info("worker_started", {
        queueName: SCRAPE_QUEUE_NAME,
        concurrency: config.SCRAPE_WORKER_CONCURRENCY,
    });

    const shutdown = async (signal: NodeJS.Signals) => {
        logger.info("worker_shutdown_signal_received", {
            signal,
        });
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

if (isMainModule(import.meta.url)) {
    runWorker().catch(async (error) => {
        logger.error("worker_startup_failed", {
            error,
        });
        await prisma.$disconnect();
        process.exit(1);
    });
}
