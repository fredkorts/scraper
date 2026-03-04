import { z } from "zod";
import { authUserSchema, notificationChannelSchema, notificationChannelsResponseSchema } from "../../lib/api/schemas";

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

export const settingsSummarySchema = z.object({
    user: authUserSchema,
    subscriptions: subscriptionsResponseSchema,
    channels: notificationChannelsResponseSchema.shape.channels,
});

export type SettingsTab = z.infer<typeof settingsTabSchema>;
export type SubscriptionsData = z.infer<typeof subscriptionsResponseSchema>;
export type NotificationChannelsData = z.infer<typeof notificationChannelsResponseSchema>;
export type UpdateProfileRequestData = z.infer<typeof updateProfileRequestSchema>;
export type UpdateProfileResponseData = z.infer<typeof updateProfileResponseSchema>;
export type TriggerRunResponseData = z.infer<typeof triggerRunResponseSchema>;
export type CategorySettingsResponseData = z.infer<typeof updateCategorySettingsResponseSchema>;
export type ChannelData = z.infer<typeof notificationChannelSchema>;
