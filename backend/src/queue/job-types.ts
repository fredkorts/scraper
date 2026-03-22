import { z } from "zod";

export const SCRAPE_QUEUE_NAME = "scrape-queue";
export const SCRAPE_CATEGORY_JOB_NAME = "scrape-category";

export const scrapeJobTriggerSchema = z.enum(["scheduler", "manual"]);
export type ScrapeJobTrigger = z.infer<typeof scrapeJobTriggerSchema>;

export const scrapeCategoryJobDataSchema = z.object({
    categoryId: z.string().uuid(),
    trigger: scrapeJobTriggerSchema,
    requestedAt: z.string().datetime({ offset: true }),
    requestId: z.string().trim().min(1).max(120).optional(),
});

export type ScrapeCategoryJobData = z.infer<typeof scrapeCategoryJobDataSchema>;

export type ScrapeCategoryJobStatus = "completed" | "skipped";

export interface ScrapeCategoryJobResult {
    status: ScrapeCategoryJobStatus;
    nextRunAt: string;
    scrapeRunId?: string;
    reason?: string;
}
