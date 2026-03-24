import { describe, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";
import { enqueueScrapeCategoryJob } from "./enqueue";
import type { ScrapeCategoryJobData } from "./job-types";

const categoryId = "11111111-1111-4111-8111-111111111111";

describe("enqueue scrape category job", () => {
    it("skips when an active-state job already exists and force is not enabled", async () => {
        const queue = {
            getJob: vi.fn().mockResolvedValue({
                getState: vi.fn().mockResolvedValue("waiting"),
                remove: vi.fn(),
            }),
            add: vi.fn(),
        } as unknown as Queue<ScrapeCategoryJobData>;

        const result = await enqueueScrapeCategoryJob(queue, {
            categoryId,
            trigger: "manual",
        });

        expect(result).toEqual({
            categoryId,
            jobId: `scrape:category:${categoryId}`,
            status: "skipped-existing",
        });
        expect(queue.add).not.toHaveBeenCalled();
    });

    it("replaces waiting jobs when force enqueue is enabled", async () => {
        const remove = vi.fn().mockResolvedValue(undefined);
        const queue = {
            getJob: vi.fn().mockResolvedValue({
                getState: vi.fn().mockResolvedValue("waiting"),
                remove,
            }),
            add: vi.fn().mockResolvedValue(undefined),
        } as unknown as Queue<ScrapeCategoryJobData>;

        const result = await enqueueScrapeCategoryJob(queue, {
            categoryId,
            trigger: "manual",
            forceEnqueue: true,
        });

        expect(remove).toHaveBeenCalledTimes(1);
        expect(queue.add).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            categoryId,
            jobId: `scrape:category:${categoryId}`,
            status: "enqueued",
        });
    });

    it("does not replace active jobs even when force enqueue is enabled", async () => {
        const remove = vi.fn();
        const queue = {
            getJob: vi.fn().mockResolvedValue({
                getState: vi.fn().mockResolvedValue("active"),
                remove,
            }),
            add: vi.fn(),
        } as unknown as Queue<ScrapeCategoryJobData>;

        const result = await enqueueScrapeCategoryJob(queue, {
            categoryId,
            trigger: "manual",
            forceEnqueue: true,
        });

        expect(remove).not.toHaveBeenCalled();
        expect(queue.add).not.toHaveBeenCalled();
        expect(result).toEqual({
            categoryId,
            jobId: `scrape:category:${categoryId}`,
            status: "skipped-existing",
        });
    });
});
