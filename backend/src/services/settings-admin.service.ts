import {
    ScrapeStatus,
    type AdminSchedulerStateResponse,
    type Category,
    type SchedulerEligibilityStatus,
    type SchedulerQueueStatus,
    type ScrapeInterval,
} from "@mabrik/shared";
import { ScrapeRunStatus as PrismaScrapeRunStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { createScrapeQueue } from "../queue/queues";
import { buildCategoryScrapeJobId, enqueueScrapeCategoryJob } from "../queue/enqueue";
import { buildCategoryHierarchy } from "./category-hierarchy.service";

const scrapeStatusMap: Record<PrismaScrapeRunStatus, ScrapeStatus> = {
    PENDING: ScrapeStatus.PENDING,
    RUNNING: ScrapeStatus.RUNNING,
    COMPLETED: ScrapeStatus.COMPLETED,
    FAILED: ScrapeStatus.FAILED,
};

const mapJobStateToQueueStatus = (jobState: string): SchedulerQueueStatus => {
    if (jobState === "active") {
        return "active";
    }

    if (["waiting", "delayed", "prioritized", "waiting-children"].includes(jobState)) {
        return "queued";
    }

    return "idle";
};

const ADMIN_SCHEDULER_QUEUE_LOOKUP_TIMEOUT_MS = 1_500;

const toErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutLabel: string): Promise<T> => {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(timeoutLabel));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
};

const buildIdleQueueStatusMap = (categoryIds: readonly string[]): Map<string, SchedulerQueueStatus> =>
    new Map(categoryIds.map((categoryId) => [categoryId, "idle"] as const));

const resolveQueueStatusByCategory = async (
    categoryIds: readonly string[],
    queueLookupTimeoutMs: number,
): Promise<Map<string, SchedulerQueueStatus>> => {
    if (categoryIds.length === 0) {
        return new Map();
    }

    let queue: ReturnType<typeof createScrapeQueue>;

    try {
        queue = createScrapeQueue();
    } catch (error) {
        logger.warn("admin_scheduler_state_queue_unavailable", {
            errorMessage: toErrorMessage(error),
        });
        return buildIdleQueueStatusMap(categoryIds);
    }

    try {
        const queueStatuses = await Promise.all(
            categoryIds.map(async (categoryId) => {
                try {
                    const job = await withTimeout(
                        queue.getJob(buildCategoryScrapeJobId(categoryId)),
                        queueLookupTimeoutMs,
                        "Timed out resolving category queue job",
                    );
                    if (!job) {
                        return [categoryId, "idle"] as const;
                    }

                    const jobState = await withTimeout(
                        job.getState(),
                        queueLookupTimeoutMs,
                        "Timed out resolving category queue state",
                    );
                    return [categoryId, mapJobStateToQueueStatus(jobState)] as const;
                } catch (error) {
                    logger.warn("admin_scheduler_state_queue_status_unavailable", {
                        categoryId,
                        errorMessage: toErrorMessage(error),
                    });
                    return [categoryId, "idle"] as const;
                }
            }),
        );

        return new Map(queueStatuses);
    } finally {
        try {
            await queue.close();
        } catch (error) {
            logger.warn("admin_scheduler_state_queue_close_failed", {
                errorMessage: toErrorMessage(error),
            });
        }
    }
};

const resolveEligibilityStatus = (input: {
    isActive: boolean;
    activeSubscriberCount: number;
    nextRunAt: Date | null;
    now: Date;
}): SchedulerEligibilityStatus => {
    if (!input.isActive) {
        return "inactive_category";
    }

    if (input.activeSubscriberCount === 0) {
        return "no_active_subscribers";
    }

    if (!input.nextRunAt || input.nextRunAt <= input.now) {
        return "eligible";
    }

    return "not_due_yet";
};

export const updateCategorySettings = async (
    categoryId: string,
    scrapeIntervalHours: ScrapeInterval,
): Promise<{ category: Category }> => {
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
    });

    if (!category) {
        throw new AppError(404, "category_not_found", "Category not found");
    }

    const updated = await prisma.category.update({
        where: { id: categoryId },
        data: {
            scrapeIntervalHours,
        },
    });

    return {
        category: {
            id: updated.id,
            slug: updated.slug,
            nameEt: updated.nameEt,
            nameEn: updated.nameEn,
            parentId: updated.parentId ?? undefined,
            isActive: updated.isActive,
            scrapeIntervalHours: updated.scrapeIntervalHours as ScrapeInterval,
            nextRunAt: updated.nextRunAt?.toISOString(),
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        },
    };
};

export const triggerCategoryRun = async (
    categoryId: string,
    requestId?: string,
    force: boolean = true,
): Promise<{
    accepted: true;
    categoryId: string;
    mode: "queued" | "direct";
    scrapeRunId?: string;
    jobId?: string;
}> => {
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: {
            id: true,
            isActive: true,
        },
    });

    if (!category) {
        throw new AppError(404, "category_not_found", "Category not found");
    }

    if (!category.isActive) {
        throw new AppError(409, "category_inactive", "Cannot trigger a scrape for an inactive category");
    }

    const queue = createScrapeQueue();

    try {
        const result = await enqueueScrapeCategoryJob(queue, {
            categoryId,
            trigger: "manual",
            requestId,
            forceEnqueue: force,
        });

        return {
            accepted: true,
            categoryId,
            mode: "queued",
            jobId: result.jobId,
        };
    } finally {
        await queue.close();
    }
};

export const getAdminSchedulerState = async (
    now: Date = new Date(),
    options: {
        queueLookupTimeoutMs?: number;
    } = {},
): Promise<AdminSchedulerStateResponse> => {
    const queueLookupTimeoutMs = options.queueLookupTimeoutMs ?? ADMIN_SCHEDULER_QUEUE_LOOKUP_TIMEOUT_MS;

    const categories = await prisma.category.findMany({
        select: {
            id: true,
            slug: true,
            nameEt: true,
            nameEn: true,
            parentId: true,
            isActive: true,
            scrapeIntervalHours: true,
            nextRunAt: true,
        },
    });

    const orderedCategories = buildCategoryHierarchy(categories);
    const categoryIds = orderedCategories.map((category) => category.id);

    const [subscriptionCounts, latestRuns] = await Promise.all([
        prisma.userSubscription.groupBy({
            by: ["categoryId"],
            where: {
                categoryId: {
                    in: categoryIds,
                },
                isActive: true,
                user: {
                    isActive: true,
                },
            },
            _count: {
                _all: true,
            },
        }),
        prisma.scrapeRun.findMany({
            where: {
                categoryId: {
                    in: categoryIds,
                },
            },
            orderBy: [
                {
                    categoryId: "asc",
                },
                {
                    startedAt: "desc",
                },
            ],
            distinct: ["categoryId"],
            select: {
                categoryId: true,
                startedAt: true,
                status: true,
            },
        }),
    ]);

    const subscriberCountByCategoryId = new Map(
        subscriptionCounts.map((count) => [count.categoryId, count._count._all] as const),
    );
    const latestRunByCategoryId = new Map(latestRuns.map((run) => [run.categoryId, run] as const));
    const queueStatusByCategoryId = await resolveQueueStatusByCategory(categoryIds, queueLookupTimeoutMs);

    return {
        items: orderedCategories.map((category) => {
            const activeSubscriberCount = subscriberCountByCategoryId.get(category.id) ?? 0;
            const latestRun = latestRunByCategoryId.get(category.id);

            return {
                categoryId: category.id,
                categorySlug: category.slug,
                categoryNameEt: category.nameEt,
                categoryPathNameEt: category.pathNameEt,
                isActive: category.isActive,
                scrapeIntervalHours: category.scrapeIntervalHours as ScrapeInterval,
                nextRunAt: category.nextRunAt?.toISOString(),
                activeSubscriberCount,
                eligibilityStatus: resolveEligibilityStatus({
                    isActive: category.isActive,
                    activeSubscriberCount,
                    nextRunAt: category.nextRunAt,
                    now,
                }),
                queueStatus: queueStatusByCategoryId.get(category.id) ?? "idle",
                lastRunAt: latestRun?.startedAt.toISOString(),
                lastRunStatus: latestRun ? scrapeStatusMap[latestRun.status] : undefined,
            };
        }),
        generatedAt: now.toISOString(),
    };
};
