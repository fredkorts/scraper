import { SCRAPE_INTERVALS } from "@mabrik/shared";
import { z } from "zod";

export const updateProfileSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters long")
        .max(100, "Name must be at most 100 characters long"),
});

export const createSubscriptionSchema = z.object({
    categoryId: z.string().uuid(),
});

export const subscriptionIdParamSchema = z.object({
    id: z.string().uuid(),
});

export const categorySettingsParamSchema = z.object({
    id: z.string().uuid(),
});

export const updateCategorySettingsSchema = z.object({
    scrapeIntervalHours: z.union(
        SCRAPE_INTERVALS.map((interval) => z.literal(interval)) as [
            z.ZodLiteral<(typeof SCRAPE_INTERVALS)[number]>,
            z.ZodLiteral<(typeof SCRAPE_INTERVALS)[number]>,
            ...z.ZodLiteral<(typeof SCRAPE_INTERVALS)[number]>[],
        ],
    ),
});

export const triggerRunSchema = z.object({
    categoryId: z.string().uuid(),
});
