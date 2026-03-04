export const SCRAPE_QUEUE_NAME = "scrape-queue";
export const SCRAPE_CATEGORY_JOB_NAME = "scrape-category";

export type ScrapeJobTrigger = "scheduler" | "manual";

export interface ScrapeCategoryJobData {
    categoryId: string;
    trigger: ScrapeJobTrigger;
    requestedAt: string;
    requestId?: string;
}

export type ScrapeCategoryJobStatus = "completed" | "skipped";

export interface ScrapeCategoryJobResult {
    status: ScrapeCategoryJobStatus;
    nextRunAt: string;
    scrapeRunId?: string;
    reason?: string;
}
