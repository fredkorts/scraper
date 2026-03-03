import { z } from "zod";

const scrapeStatusSchema = z.enum(["pending", "running", "completed", "failed"]);
const changeTypeSchema = z.enum(["price_increase", "price_decrease", "new_product", "sold_out", "back_in_stock"]);

export const dashboardHomeResponseSchema = z.object({
    latestRuns: z.array(
        z.object({
            id: z.string().uuid(),
            categoryId: z.string().uuid(),
            categoryName: z.string(),
            status: scrapeStatusSchema,
            startedAt: z.string(),
            completedAt: z.string().optional(),
            totalChanges: z.number(),
            totalProducts: z.number(),
        }),
    ),
    recentFailures: z.array(
        z.object({
            id: z.string().uuid(),
            categoryId: z.string().uuid(),
            categoryName: z.string(),
            startedAt: z.string(),
            errorMessage: z.string().optional(),
        }),
    ),
    recentChangeSummary: z.object({
        priceIncrease: z.number(),
        priceDecrease: z.number(),
        newProduct: z.number(),
        soldOut: z.number(),
        backInStock: z.number(),
    }),
});

export const runsListResponseSchema = z.object({
    items: z.array(
        z.object({
            id: z.string().uuid(),
            categoryId: z.string().uuid(),
            categoryName: z.string(),
            status: scrapeStatusSchema,
            totalProducts: z.number(),
            totalChanges: z.number(),
            pagesScraped: z.number(),
            durationMs: z.number().optional(),
            startedAt: z.string(),
            completedAt: z.string().optional(),
            errorMessage: z.string().optional(),
        }),
    ),
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
});

export const runDetailResponseSchema = z.object({
    run: z.object({
        id: z.string().uuid(),
        categoryId: z.string().uuid(),
        categoryName: z.string(),
        status: scrapeStatusSchema,
        totalProducts: z.number(),
        totalChanges: z.number(),
        newProducts: z.number(),
        priceChanges: z.number(),
        soldOut: z.number(),
        backInStock: z.number(),
        pagesScraped: z.number(),
        durationMs: z.number().optional(),
        errorMessage: z.string().optional(),
        startedAt: z.string(),
        completedAt: z.string().optional(),
    }),
});

export const runProductsResponseSchema = z.object({
    items: z.array(
        z.object({
            id: z.string().uuid(),
            scrapeRunId: z.string().uuid(),
            productId: z.string().uuid(),
            name: z.string(),
            price: z.number(),
            originalPrice: z.number().optional(),
            inStock: z.boolean(),
            imageUrl: z.string(),
            externalUrl: z.string().url(),
            scrapedAt: z.string(),
        }),
    ),
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
});

export const runChangesResponseSchema = z.object({
    items: z.array(
        z.object({
            id: z.string().uuid(),
            changeType: changeTypeSchema,
            oldPrice: z.number().optional(),
            newPrice: z.number().optional(),
            oldStockStatus: z.boolean().optional(),
            newStockStatus: z.boolean().optional(),
            product: z.object({
                id: z.string().uuid(),
                name: z.string(),
                imageUrl: z.string(),
                externalUrl: z.string().url(),
            }),
        }),
    ),
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
});

export type DashboardHomeData = z.infer<typeof dashboardHomeResponseSchema>;
export type RunsListData = z.infer<typeof runsListResponseSchema>;
export type RunDetailData = z.infer<typeof runDetailResponseSchema>;
export type RunProductsData = z.infer<typeof runProductsResponseSchema>;
export type RunChangesData = z.infer<typeof runChangesResponseSchema>;
