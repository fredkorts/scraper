import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api/client";
import { apiEndpoints } from "../../lib/api/endpoints";
import { notificationChannelsResponseSchema, telegramLinkStatusResponseSchema } from "../../lib/api/schemas";
import { queryKeys } from "../../lib/query/query-keys";
import {
    adminSchedulerStateResponseSchema,
    subscriptionsResponseSchema,
    trackedProductsResponseSchema,
} from "./schemas";
import type {
    AdminSchedulerStateData,
    NotificationChannelsData,
    SubscriptionsData,
    TelegramLinkStatusData,
    TrackedProductsData,
} from "./types/settings-schema.types";

export const subscriptionsQueryOptions = () =>
    queryOptions<SubscriptionsData>({
        queryKey: queryKeys.settings.subscriptions(),
        queryFn: () => apiGet(apiEndpoints.subscriptions.list, subscriptionsResponseSchema),
    });

export const notificationChannelsQueryOptions = () =>
    queryOptions<NotificationChannelsData>({
        queryKey: queryKeys.notifications.channels(),
        queryFn: () => apiGet(apiEndpoints.notifications.channels, notificationChannelsResponseSchema),
    });

export const telegramLinkStatusQueryOptions = (enabled: boolean = true) =>
    queryOptions<TelegramLinkStatusData>({
        queryKey: queryKeys.notifications.telegramLinkStatus(),
        queryFn: () => apiGet(apiEndpoints.notifications.telegramLinkStatus, telegramLinkStatusResponseSchema),
        enabled,
        refetchOnWindowFocus: false,
    });

export const adminSchedulerStateQueryOptions = (enabled: boolean = true) =>
    queryOptions<AdminSchedulerStateData>({
        queryKey: queryKeys.settings.adminSchedulerState(),
        queryFn: () => apiGet(apiEndpoints.admin.schedulerState, adminSchedulerStateResponseSchema),
        enabled,
    });

export const useSubscriptionsQuery = () => useQuery(subscriptionsQueryOptions());
export const trackedProductsQueryOptions = (enabled: boolean = true) =>
    queryOptions<TrackedProductsData>({
        queryKey: queryKeys.settings.trackedProducts(),
        queryFn: () => apiGet(apiEndpoints.trackedProducts.list, trackedProductsResponseSchema),
        enabled,
    });

export const useTrackedProductsQuery = (enabled: boolean = true) => useQuery(trackedProductsQueryOptions(enabled));
export const useNotificationChannelsQuery = () => useQuery(notificationChannelsQueryOptions());
export const useTelegramLinkStatusQuery = (enabled: boolean = true) =>
    useQuery(telegramLinkStatusQueryOptions(enabled));
export const useAdminSchedulerStateQuery = (enabled: boolean = true) =>
    useQuery(adminSchedulerStateQueryOptions(enabled));
