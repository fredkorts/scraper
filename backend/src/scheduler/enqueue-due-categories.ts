import type { Queue } from "bullmq";
import { prisma } from "../lib/prisma";
import { enqueueScrapeCategoryJob } from "../queue/enqueue";
import type { ScrapeCategoryJobData } from "../queue/job-types";
import { createScrapeQueue } from "../queue/queues";

interface EnqueueDueCategoriesOptions {
    now?: Date;
    queue?: Queue<ScrapeCategoryJobData>;
}

interface EnqueueFailure {
    categoryId: string;
    message: string;
}

export interface EnqueueDueCategoriesResult {
    checkedCount: number;
    enqueuedCount: number;
    skippedExistingCount: number;
    failedCount: number;
    failures: EnqueueFailure[];
}

const getDueCategories = async (now: Date) => {
    return prisma.category.findMany({
        where: {
            isActive: true,
            OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
            subscriptions: {
                some: {
                    isActive: true,
                    user: {
                        isActive: true,
                    },
                },
            },
        },
        select: {
            id: true,
        },
        orderBy: {
            nextRunAt: "asc",
        },
    });
};

export const enqueueDueCategories = async (
    options: EnqueueDueCategoriesOptions = {},
): Promise<EnqueueDueCategoriesResult> => {
    const now = options.now ?? new Date();
    const queue = options.queue ?? createScrapeQueue();
    const ownsQueue = !options.queue;

    try {
        const dueCategories = await getDueCategories(now);
        let enqueuedCount = 0;
        let skippedExistingCount = 0;
        const failures: EnqueueFailure[] = [];

        for (const category of dueCategories) {
            try {
                const enqueueResult = await enqueueScrapeCategoryJob(queue, {
                    categoryId: category.id,
                    trigger: "scheduler",
                    requestedAt: now,
                    requestId: `scheduler:${now.toISOString()}`,
                });

                if (enqueueResult.status === "enqueued") {
                    enqueuedCount += 1;
                } else {
                    skippedExistingCount += 1;
                }
            } catch (error) {
                failures.push({
                    categoryId: category.id,
                    message: error instanceof Error ? error.message : "Unknown enqueue error",
                });
            }
        }

        return {
            checkedCount: dueCategories.length,
            enqueuedCount,
            skippedExistingCount,
            failedCount: failures.length,
            failures,
        };
    } finally {
        if (ownsQueue) {
            await queue.close();
        }
    }
};
