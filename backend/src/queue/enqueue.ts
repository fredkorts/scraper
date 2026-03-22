import type { JobsOptions, Queue } from "bullmq";
import { SCRAPE_CATEGORY_JOB_NAME, type ScrapeCategoryJobData, type ScrapeJobTrigger } from "./job-types";

const ACTIVE_JOB_STATES = new Set(["waiting", "active", "delayed", "prioritized", "waiting-children"]);

const DEFAULT_SCRAPE_JOB_OPTIONS: JobsOptions = {
    attempts: 3,
    backoff: {
        type: "exponential",
        delay: 10_000,
    },
    removeOnComplete: true,
    removeOnFail: true,
};

type EnqueueResultStatus = "enqueued" | "skipped-existing";

interface EnqueueScrapeCategoryResult {
    categoryId: string;
    jobId: string;
    status: EnqueueResultStatus;
}

interface EnqueueScrapeCategoryInput {
    categoryId: string;
    trigger: ScrapeJobTrigger;
    requestedAt?: Date;
    requestId?: string;
    jobOptions?: JobsOptions;
}

export const buildCategoryScrapeJobId = (categoryId: string): string => {
    return `scrape:category:${categoryId}`;
};

const isDuplicateJobError = (error: unknown): boolean => {
    return error instanceof Error && /exists|duplicat/i.test(error.message);
};

export const enqueueScrapeCategoryJob = async (
    queue: Queue<ScrapeCategoryJobData>,
    input: EnqueueScrapeCategoryInput,
): Promise<EnqueueScrapeCategoryResult> => {
    const requestedAt = input.requestedAt ?? new Date();
    const jobId = buildCategoryScrapeJobId(input.categoryId);
    const existingJob = await queue.getJob(jobId);

    if (existingJob) {
        const state = await existingJob.getState();
        if (ACTIVE_JOB_STATES.has(state)) {
            return {
                categoryId: input.categoryId,
                jobId,
                status: "skipped-existing",
            };
        }
    }

    try {
        await queue.add(
            SCRAPE_CATEGORY_JOB_NAME,
            {
                categoryId: input.categoryId,
                trigger: input.trigger,
                requestedAt: requestedAt.toISOString(),
                requestId: input.requestId,
            },
            {
                ...DEFAULT_SCRAPE_JOB_OPTIONS,
                ...input.jobOptions,
                jobId,
            },
        );
    } catch (error) {
        if (isDuplicateJobError(error)) {
            return {
                categoryId: input.categoryId,
                jobId,
                status: "skipped-existing",
            };
        }

        throw error;
    }

    return {
        categoryId: input.categoryId,
        jobId,
        status: "enqueued",
    };
};
