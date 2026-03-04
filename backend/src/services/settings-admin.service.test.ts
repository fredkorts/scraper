import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { triggerCategoryRun } from "./settings-admin.service";

const enqueueScrapeCategoryJob = vi.fn();
const closeQueue = vi.fn();

vi.mock("../queue/queues", () => ({
    createScrapeQueue: () => ({
        close: closeQueue,
    }),
}));

vi.mock("../queue/enqueue", () => ({
    enqueueScrapeCategoryJob: (...args: unknown[]) => enqueueScrapeCategoryJob(...args),
}));

useTestDatabase();

describe("settings admin service", () => {
    beforeEach(() => {
        enqueueScrapeCategoryJob.mockReset();
        closeQueue.mockReset();
        closeQueue.mockResolvedValue(undefined);
    });

    it("queues a manual scrape trigger for active categories", async () => {
        const category = await prisma.category.create({
            data: {
                slug: "manual-trigger-test",
                nameEt: "Manual Trigger Test",
                nameEn: "Manual Trigger Test",
                isActive: true,
            },
        });

        enqueueScrapeCategoryJob.mockResolvedValue({
            categoryId: category.id,
            jobId: `scrape:category:${category.id}`,
            status: "enqueued",
        });

        const result = await triggerCategoryRun(category.id);

        expect(result).toEqual({
            accepted: true,
            categoryId: category.id,
            mode: "queued",
            jobId: `scrape:category:${category.id}`,
        });
        expect(enqueueScrapeCategoryJob).toHaveBeenCalled();
    });
});
