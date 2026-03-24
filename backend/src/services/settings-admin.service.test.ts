import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrapeRunStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { getAdminSchedulerState, triggerCategoryRun } from "./settings-admin.service";

const enqueueScrapeCategoryJob = vi.fn();
const closeQueue = vi.fn();
const getJob = vi.fn();
const getJobState = vi.fn();
const createScrapeQueue = vi.fn();

vi.mock("../queue/queues", () => ({
    createScrapeQueue: (...args: unknown[]) => createScrapeQueue(...args),
}));

vi.mock("../queue/enqueue", () => ({
    enqueueScrapeCategoryJob: (...args: unknown[]) => enqueueScrapeCategoryJob(...args),
    buildCategoryScrapeJobId: (categoryId: string) => `scrape:category:${categoryId}`,
}));

useTestDatabase();

describe("settings admin service", () => {
    beforeEach(() => {
        enqueueScrapeCategoryJob.mockReset();
        createScrapeQueue.mockReset();
        closeQueue.mockReset();
        getJob.mockReset();
        getJobState.mockReset();
        createScrapeQueue.mockImplementation(() => ({
            getJob,
            close: closeQueue,
        }));
        closeQueue.mockResolvedValue(undefined);
        getJob.mockResolvedValue(null);
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
        expect(enqueueScrapeCategoryJob).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                categoryId: category.id,
                trigger: "manual",
                forceEnqueue: true,
            }),
        );
    });

    it("builds admin scheduler state with eligibility and queue status", async () => {
        const activeCategory = await prisma.category.create({
            data: {
                slug: "scheduler-active",
                nameEt: "Scheduler Active",
                nameEn: "Scheduler Active",
                isActive: true,
                nextRunAt: new Date(Date.now() - 60_000),
                scrapeIntervalHours: 12,
            },
        });
        const inactiveCategory = await prisma.category.create({
            data: {
                slug: "scheduler-inactive",
                nameEt: "Scheduler Inactive",
                nameEn: "Scheduler Inactive",
                isActive: false,
                scrapeIntervalHours: 24,
            },
        });
        const { user } = await prisma.$transaction(async (tx) => {
            const created = await tx.user.create({
                data: {
                    email: "scheduler-state@example.com",
                    passwordHash: "hash",
                    name: "Scheduler User",
                },
            });

            await tx.userSubscription.create({
                data: {
                    userId: created.id,
                    categoryId: activeCategory.id,
                    isActive: true,
                },
            });

            await tx.scrapeRun.create({
                data: {
                    categoryId: activeCategory.id,
                    status: ScrapeRunStatus.COMPLETED,
                    startedAt: new Date(Date.now() - 120_000),
                },
            });

            return { user: created };
        });

        getJob.mockImplementation(async (jobId: string) => {
            if (jobId.endsWith(activeCategory.id)) {
                getJobState.mockResolvedValue("waiting");
                return {
                    getState: getJobState,
                };
            }

            return null;
        });

        const response = await getAdminSchedulerState(new Date());
        const activeItem = response.items.find((item) => item.categoryId === activeCategory.id);
        const inactiveItem = response.items.find((item) => item.categoryId === inactiveCategory.id);

        expect(user).toBeDefined();
        expect(activeItem).toMatchObject({
            categoryId: activeCategory.id,
            activeSubscriberCount: 1,
            eligibilityStatus: "eligible",
            queueStatus: "queued",
            lastRunStatus: "completed",
        });
        expect(inactiveItem).toMatchObject({
            categoryId: inactiveCategory.id,
            activeSubscriberCount: 0,
            eligibilityStatus: "inactive_category",
            queueStatus: "idle",
        });
    });

    it("falls back to idle queue statuses when queue initialization fails", async () => {
        const category = await prisma.category.create({
            data: {
                slug: "scheduler-queue-init-fail",
                nameEt: "Queue Init Fail",
                nameEn: "Queue Init Fail",
                isActive: true,
                scrapeIntervalHours: 6,
            },
        });

        createScrapeQueue.mockImplementation(() => {
            throw new Error("redis unavailable");
        });

        const response = await getAdminSchedulerState(new Date());
        const item = response.items.find((candidate) => candidate.categoryId === category.id);

        expect(item).toMatchObject({
            categoryId: category.id,
            queueStatus: "idle",
        });
        expect(closeQueue).not.toHaveBeenCalled();
    });

    it("falls back to idle queue statuses when queue lookups fail", async () => {
        const category = await prisma.category.create({
            data: {
                slug: "scheduler-queue-lookup-fail",
                nameEt: "Queue Lookup Fail",
                nameEn: "Queue Lookup Fail",
                isActive: true,
                scrapeIntervalHours: 6,
            },
        });

        getJob.mockRejectedValue(new Error("redis lookup failed"));

        const response = await getAdminSchedulerState(new Date());
        const item = response.items.find((candidate) => candidate.categoryId === category.id);

        expect(item).toMatchObject({
            categoryId: category.id,
            queueStatus: "idle",
        });
        expect(closeQueue).toHaveBeenCalledTimes(1);
    });
});
