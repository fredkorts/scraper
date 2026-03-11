import { z } from "zod";
import { authUserSchema, notificationChannelsResponseSchema } from "../../lib/api/schemas";

export const settingsTabSchema = z.enum(["account", "tracking", "notifications", "plan", "admin"]);

export const subscriptionsResponseSchema = z.object({
    items: z.array(
        z.object({
            id: z.string().uuid(),
            category: z.object({
                id: z.string().uuid(),
                slug: z.string(),
                nameEt: z.string(),
                nameEn: z.string(),
            }),
            createdAt: z.string(),
            isActive: z.boolean(),
        }),
    ),
    limit: z.number().nullable(),
    used: z.number(),
    remaining: z.number().nullable(),
});

export const subscriptionCreateResponseSchema = z.object({
    item: subscriptionsResponseSchema.shape.items.element,
});

export const successResponseSchema = z.object({
    success: z.literal(true),
});

export const trackedProductSchema = z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    createdAt: z.string(),
    updatedAt: z.string(),
    product: z.object({
        id: z.string().uuid(),
        name: z.string(),
        imageUrl: z.string(),
        externalUrl: z.string().url(),
        currentPrice: z.number(),
        inStock: z.boolean(),
        isPreorder: z.boolean().optional(),
        preorderEta: z.string().optional(),
        preorderDetectedFrom: z.enum(["category_slug", "title", "description"]).optional(),
        categories: z.array(
            z.object({
                id: z.string().uuid(),
                slug: z.string(),
                nameEt: z.string(),
                nameEn: z.string(),
            }),
        ),
    }),
});

export const trackedProductsResponseSchema = z.object({
    items: z.array(trackedProductSchema),
});

export const trackProductResponseSchema = z.object({
    item: trackedProductSchema,
});

export const subscriptionDeleteResponseSchema = z.object({
    success: z.literal(true),
    autoDisabledWatchCount: z.number().int().nonnegative().optional().default(0),
});

export const updateProfileRequestSchema = z.object({
    name: z.string().trim().min(2).max(100),
});

export const updateProfileResponseSchema = z.object({
    user: authUserSchema,
});

export const updateCategorySettingsResponseSchema = z.object({
    category: z.object({
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
});

export const triggerRunResponseSchema = z.object({
    accepted: z.literal(true),
    categoryId: z.string().uuid(),
    mode: z.enum(["queued", "direct"]),
    scrapeRunId: z.string().uuid().optional(),
    jobId: z.string().optional(),
});

export const adminSchedulerStateResponseSchema = z.object({
    items: z.array(
        z.object({
            categoryId: z.string().uuid(),
            categorySlug: z.string(),
            categoryNameEt: z.string(),
            categoryPathNameEt: z.string(),
            isActive: z.boolean(),
            scrapeIntervalHours: z.union([z.literal(6), z.literal(12), z.literal(24), z.literal(48)]),
            nextRunAt: z.string().optional(),
            activeSubscriberCount: z.number().int().nonnegative(),
            eligibilityStatus: z.enum(["eligible", "inactive_category", "no_active_subscribers", "not_due_yet"]),
            queueStatus: z.enum(["idle", "queued", "active"]),
            lastRunAt: z.string().optional(),
            lastRunStatus: z.enum(["pending", "running", "completed", "failed"]).optional(),
        }),
    ),
    generatedAt: z.string(),
});

export const settingsSummarySchema = z.object({
    user: authUserSchema,
    subscriptions: subscriptionsResponseSchema,
    channels: notificationChannelsResponseSchema.shape.channels,
});
