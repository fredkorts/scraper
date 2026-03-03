import { z } from "zod";

const scrapeStatusSchema = z.enum(["pending", "running", "completed", "failed"]);

export const productDetailResponseSchema = z.object({
    product: z.object({
        id: z.string().uuid(),
        name: z.string(),
        imageUrl: z.string(),
        externalUrl: z.string().url(),
        currentPrice: z.number(),
        originalPrice: z.number().optional(),
        inStock: z.boolean(),
        firstSeenAt: z.string(),
        lastSeenAt: z.string(),
        historyPointCount: z.number(),
        categories: z.array(
            z.object({
                id: z.string().uuid(),
                slug: z.string(),
                nameEt: z.string(),
                nameEn: z.string(),
            }),
        ),
        recentRuns: z.array(
            z.object({
                id: z.string().uuid(),
                categoryId: z.string().uuid(),
                categoryName: z.string(),
                status: scrapeStatusSchema,
                startedAt: z.string(),
                completedAt: z.string().optional(),
            }),
        ),
    }),
});

export const productHistoryResponseSchema = z.object({
    items: z.array(
        z.object({
            id: z.string().uuid(),
            scrapeRunId: z.string().uuid(),
            categoryId: z.string().uuid(),
            categoryName: z.string(),
            price: z.number(),
            originalPrice: z.number().optional(),
            inStock: z.boolean(),
            scrapedAt: z.string(),
        }),
    ),
});

export type ProductDetailData = z.infer<typeof productDetailResponseSchema>;
export type ProductHistoryData = z.infer<typeof productHistoryResponseSchema>;
