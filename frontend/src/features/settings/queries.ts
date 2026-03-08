import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api/client";
import { apiEndpoints } from "../../lib/api/endpoints";
import { notificationChannelsResponseSchema } from "../../lib/api/schemas";
import { queryKeys } from "../../lib/query/query-keys";
import { adminSchedulerStateResponseSchema, subscriptionsResponseSchema } from "./schemas";
import type {
    AdminSchedulerStateData,
    NotificationChannelsData,
    SubscriptionsData,
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

export const adminSchedulerStateQueryOptions = (enabled: boolean = true) =>
    queryOptions<AdminSchedulerStateData>({
        queryKey: queryKeys.settings.adminSchedulerState(),
        queryFn: () => apiGet(apiEndpoints.admin.schedulerState, adminSchedulerStateResponseSchema),
        enabled,
    });

export const useSubscriptionsQuery = () => useQuery(subscriptionsQueryOptions());
export const useNotificationChannelsQuery = () => useQuery(notificationChannelsQueryOptions());
export const useAdminSchedulerStateQuery = (enabled: boolean = true) =>
    useQuery(adminSchedulerStateQueryOptions(enabled));
