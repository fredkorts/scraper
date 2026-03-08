import type {
    NotificationChannelCreateRequest,
    NotificationChannelUpdateRequest,
    TriggerRunRequest,
    UpdateCategorySettingsRequest,
    UpdateProfileRequest,
} from "@mabrik/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiPatch, apiPost } from "../../lib/api/client";
import { apiEndpoints } from "../../lib/api/endpoints";
import { notificationChannelResponseSchema } from "../../lib/api/schemas";
import { queryKeys } from "../../lib/query/query-keys";
import {
    subscriptionCreateResponseSchema,
    successResponseSchema,
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
            apiDelete(apiEndpoints.subscriptions.detail(subscriptionId), successResponseSchema),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.settings.subscriptions() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.runs.list() }),
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
