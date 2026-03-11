import type { z } from "zod";
import { notificationChannelsResponseSchema, notificationChannelSchema } from "../../../lib/api/schemas";
import {
    settingsTabSchema,
    subscriptionsResponseSchema,
    updateProfileRequestSchema,
    updateProfileResponseSchema,
    triggerRunResponseSchema,
    updateCategorySettingsResponseSchema,
    adminSchedulerStateResponseSchema,
    trackedProductsResponseSchema,
    trackedProductSchema,
    subscriptionDeleteResponseSchema,
} from "../schemas";

export type SettingsTab = z.infer<typeof settingsTabSchema>;
export type SubscriptionsData = z.infer<typeof subscriptionsResponseSchema>;
export type NotificationChannelsData = z.infer<typeof notificationChannelsResponseSchema>;
export type UpdateProfileRequestData = z.infer<typeof updateProfileRequestSchema>;
export type UpdateProfileResponseData = z.infer<typeof updateProfileResponseSchema>;
export type TriggerRunResponseData = z.infer<typeof triggerRunResponseSchema>;
export type CategorySettingsResponseData = z.infer<typeof updateCategorySettingsResponseSchema>;
export type AdminSchedulerStateData = z.infer<typeof adminSchedulerStateResponseSchema>;
export type AdminSchedulerStateItemData = AdminSchedulerStateData["items"][number];
export type ChannelData = z.infer<typeof notificationChannelSchema>;
export type TrackedProductsData = z.infer<typeof trackedProductsResponseSchema>;
export type TrackedProductData = z.infer<typeof trackedProductSchema>;
export type SubscriptionDeleteResponseData = z.infer<typeof subscriptionDeleteResponseSchema>;
