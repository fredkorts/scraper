import type {
    NotificationChannelCreateRequest,
    TelegramLinkConfirmRequest,
    NotificationChannelUpdateRequest,
    TriggerRunRequest,
    UpdateCategorySettingsRequest,
    UpdateProfileRequest,
} from "@mabrik/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiPatch, apiPost } from "../../lib/api/client";
import { apiEndpoints } from "../../lib/api/endpoints";
import {
    notificationChannelResponseSchema,
    telegramLinkConfirmResponseSchema,
    telegramLinkStartResponseSchema,
} from "../../lib/api/schemas";
import { queryKeys } from "../../lib/query/query-keys";
import {
    subscriptionDeleteResponseSchema,
    subscriptionCreateResponseSchema,
    successResponseSchema,
    trackProductResponseSchema,
    triggerRunResponseSchema,
    updateCategorySettingsResponseSchema,
    updateProfileRequestSchema,
    updateProfileResponseSchema,
} from "./schemas";

export const useUpdateProfileMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpdateProfileRequest) =>
            apiPatch(
                apiEndpoints.auth.updateMe,
                updateProfileRequestSchema.parse(payload),
                updateProfileResponseSchema,
            ),
        onSuccess: (result) => {
            queryClient.setQueryData(queryKeys.auth.me(), result.user);
        },
    });
};

export const useCreateSubscriptionMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (categoryId: string) =>
            apiPost(apiEndpoints.subscriptions.list, { categoryId }, subscriptionCreateResponseSchema),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.subscriptions() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.runs.list() }),
            ]);
        },
    });
};

export const useDeleteSubscriptionMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (subscriptionId: string) =>
            apiDelete(apiEndpoints.subscriptions.detail(subscriptionId), subscriptionDeleteResponseSchema),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.subscriptions() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.trackedProducts() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.runs.list() }),
            ]);
        },
    });
};

export const useTrackProductMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (productId: string) =>
            apiPost(apiEndpoints.trackedProducts.list, { productId }, trackProductResponseSchema),
        onSuccess: async (result) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.trackedProducts() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.subscriptions() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(result.item.productId) }),
                queryClient.invalidateQueries({ queryKey: ["runs", "products"] }),
                queryClient.invalidateQueries({ queryKey: ["runs", "changes"] }),
                queryClient.invalidateQueries({ queryKey: ["changes", "list"] }),
            ]);
        },
    });
};

export const useUntrackProductMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (productId: string) =>
            apiDelete(apiEndpoints.trackedProducts.byProduct(productId), successResponseSchema),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.trackedProducts() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.subscriptions() }),
                queryClient.invalidateQueries({ queryKey: ["products", "detail"] }),
                queryClient.invalidateQueries({ queryKey: ["runs", "products"] }),
                queryClient.invalidateQueries({ queryKey: ["runs", "changes"] }),
                queryClient.invalidateQueries({ queryKey: ["changes", "list"] }),
            ]);
        },
    });
};

export const useCreateNotificationChannelMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: NotificationChannelCreateRequest) =>
            apiPost(apiEndpoints.notifications.channels, payload, notificationChannelResponseSchema),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.channels() });
        },
    });
};

export const useUpdateNotificationChannelMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: NotificationChannelUpdateRequest }) =>
            apiPatch(apiEndpoints.notifications.detail(id), payload, notificationChannelResponseSchema),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.channels() });
        },
    });
};

export const useDeleteNotificationChannelMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiDelete(apiEndpoints.notifications.detail(id), successResponseSchema),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.channels() });
        },
    });
};

export const useStartTelegramLinkMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => apiPost(apiEndpoints.notifications.telegramLink, undefined, telegramLinkStartResponseSchema),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.telegramLinkStatus() });
        },
    });
};

export const useConfirmTelegramLinkMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: TelegramLinkConfirmRequest) =>
            apiPost(apiEndpoints.notifications.telegramConfirm, payload, telegramLinkConfirmResponseSchema),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.notifications.channels() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.notifications.telegramLinkStatus() }),
            ]);
        },
    });
};

export const useUpdateCategorySettingsMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateCategorySettingsRequest }) =>
            apiPatch(apiEndpoints.categories.settings(id), payload, updateCategorySettingsResponseSchema),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.categories.list("all") }),
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.adminSchedulerState() }),
            ]);
        },
    });
};

export const useTriggerRunMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: TriggerRunRequest) =>
            apiPost(apiEndpoints.runs.trigger, payload, triggerRunResponseSchema),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.runs.list() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.adminSchedulerState() }),
            ]);
        },
    });
};
