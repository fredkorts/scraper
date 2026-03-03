import { z } from "zod";

export const categoriesResponseSchema = z.object({
    categories: z.array(
        z.object({
            id: z.string().uuid(),
            slug: z.string(),
            nameEt: z.string(),
            nameEn: z.string(),
            parentId: z.string().uuid().optional(),
            isActive: z.boolean(),
            scrapeIntervalHours: z.union([z.literal(6), z.literal(12), z.literal(24), z.literal(48)]),
            nextRunAt: z.string().optional(),
            createdAt: z.string(),
            updatedAt: z.string(),
        }),
    ),
});

export type CategoriesData = z.infer<typeof categoriesResponseSchema>;
