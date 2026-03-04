import type { z } from "zod";
import {
    notificationChannelsResponseSchema,
    notificationChannelSchema,
} from "../../../lib/api/schemas";
import {
    settingsTabSchema,
    subscriptionsResponseSchema,
    updateProfileRequestSchema,
    updateProfileResponseSchema,
    triggerRunResponseSchema,
    updateCategorySettingsResponseSchema,
} from "../schemas";

export type SettingsTab = z.infer<typeof settingsTabSchema>;
export type SubscriptionsData = z.infer<typeof subscriptionsResponseSchema>;
export type NotificationChannelsData = z.infer<typeof notificationChannelsResponseSchema>;
export type UpdateProfileRequestData = z.infer<typeof updateProfileRequestSchema>;
export type UpdateProfileResponseData = z.infer<typeof updateProfileResponseSchema>;
export type TriggerRunResponseData = z.infer<typeof triggerRunResponseSchema>;
export type CategorySettingsResponseData = z.infer<typeof updateCategorySettingsResponseSchema>;
export type ChannelData = z.infer<typeof notificationChannelSchema>;
