import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api/client";
import { apiEndpoints } from "../../lib/api/endpoints";
import { notificationChannelsResponseSchema } from "../../lib/api/schemas";
import { queryKeys } from "../../lib/query/query-keys";
import { categoriesQueryOptions } from "../categories/queries";
import {
    subscriptionsResponseSchema,
    type NotificationChannelsData,
    type SubscriptionsData,
} from "./schemas";

export const subscriptionsQueryOptions = () =>
    queryOptions<SubscriptionsData>({
        queryKey: queryKeys.settings.subscriptions(),
        queryFn: () => apiGet(apiEndpoints.subscriptions.list, subscriptionsResponseSchema),
    });

export const settingsAdminCategoriesQueryOptions = () =>
    queryOptions({
        ...categoriesQueryOptions("all"),
        queryKey: queryKeys.settings.adminCategories(),
    });

export const notificationChannelsQueryOptions = () =>
    queryOptions<NotificationChannelsData>({
        queryKey: queryKeys.notifications.channels(),
        queryFn: () => apiGet(apiEndpoints.notifications.channels, notificationChannelsResponseSchema),
    });

export const useSubscriptionsQuery = () => useQuery(subscriptionsQueryOptions());
export const useSettingsAdminCategoriesQuery = () => useQuery(settingsAdminCategoriesQueryOptions());
export const useNotificationChannelsQuery = () => useQuery(notificationChannelsQueryOptions());
