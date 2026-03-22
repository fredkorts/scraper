import { describe, expect, it, vi, afterEach } from "vitest";
import type { Queue } from "bullmq";
import { config } from "../config";
import { enqueueScrapeCategoryJob } from "./enqueue";
import type { ScrapeCategoryJobData } from "./job-types";

const originalQueueJobSchemaStrictMode = config.QUEUE_JOB_SCHEMA_STRICT_MODE;

afterEach(() => {
    config.QUEUE_JOB_SCHEMA_STRICT_MODE = originalQueueJobSchemaStrictMode;
});

describe("queue security controls", () => {
    it("rejects invalid scrape job payloads when strict schema mode is enabled", async () => {
        config.QUEUE_JOB_SCHEMA_STRICT_MODE = true;
        const queue = {
            getJob: vi.fn().mockResolvedValue(null),
            add: vi.fn().mockResolvedValue(undefined),
        } as unknown as Queue<ScrapeCategoryJobData>;

        await expect(
            enqueueScrapeCategoryJob(queue, {
                categoryId: "not-a-uuid",
                trigger: "manual",
            }),
        ).rejects.toThrow("Invalid scrape queue payload");
    });

    it("allows legacy queue payload behavior while strict mode is disabled", async () => {
        config.QUEUE_JOB_SCHEMA_STRICT_MODE = false;
        const queue = {
            getJob: vi.fn().mockResolvedValue(null),
            add: vi.fn().mockResolvedValue(undefined),
        } as unknown as Queue<ScrapeCategoryJobData>;

        const result = await enqueueScrapeCategoryJob(queue, {
            categoryId: "not-a-uuid",
            trigger: "manual",
        });

        expect(result.status).toBe("enqueued");
        expect(queue.add).toHaveBeenCalledTimes(1);
    });
});
