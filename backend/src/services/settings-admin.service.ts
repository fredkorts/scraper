import type { Category, ScrapeInterval } from "@mabrik/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { createScrapeQueue } from "../queue/queues";
import { enqueueScrapeCategoryJob } from "../queue/enqueue";

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

export const triggerCategoryRun = async (categoryId: string, requestId?: string): Promise<{
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
