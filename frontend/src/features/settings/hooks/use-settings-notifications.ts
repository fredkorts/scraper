import { useMemo, useState } from "react";
import type { NotificationChannelCreateRequest } from "@mabrik/shared";
import {
    useCreateNotificationChannelMutation,
    useDeleteNotificationChannelMutation,
    useUpdateNotificationChannelMutation,
} from "../mutations";
import { useNotificationChannelsQuery } from "../queries";
import type { UseSettingsNotificationsResult } from "../types/use-settings-notifications.types";
import { NOTIFICATION_MESSAGES } from "../../../shared/constants/notification-messages";
import { useAppNotification } from "../../../shared/hooks/use-app-notification";
import { createNotificationRequestId } from "../../../shared/notifications/request-id";
import { createNotificationRequestTracker } from "../../../shared/notifications/request-tracker";
import { normalizeUserError } from "../../../shared/utils/normalize-user-error";

export const useSettingsNotifications = (): UseSettingsNotificationsResult => {
    const channelsQuery = useNotificationChannelsQuery();
    const createChannelMutation = useCreateNotificationChannelMutation();
    const updateChannelMutation = useUpdateNotificationChannelMutation();
    const deleteChannelMutation = useDeleteNotificationChannelMutation();
    const { notify } = useAppNotification();
    const [newChannelEmail, setNewChannelEmail] = useState("");
    const requestTracker = useMemo(() => createNotificationRequestTracker(), []);

    const onCreateChannel = async () => {
        const payload: NotificationChannelCreateRequest = {
            channelType: "email",
            destination: newChannelEmail,
        };

        const actionKey = "settings:channels:create";
        const requestId = createNotificationRequestId();
        requestTracker.markLatest(actionKey, requestId);

        try {
            await createChannelMutation.mutateAsync(payload);

            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "success",
                message: NOTIFICATION_MESSAGES.settings.channelCreated.message,
                description: `${newChannelEmail} was added.`,
                key: actionKey,
                requestId,
            });
            setNewChannelEmail("");
        } catch (error) {
            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.settings.channelCreateFailed.message,
                description: normalizeUserError(error, "Failed to add channel"),
                key: actionKey,
                requestId,
            });
        }
    };

    const onToggleChannelDefault = async (channelId: string, isDefault: boolean) => {
        const actionKey = `settings:channels:update-default:${channelId}`;
        const requestId = createNotificationRequestId();
        requestTracker.markLatest(actionKey, requestId);

        try {
            await updateChannelMutation.mutateAsync({
                id: channelId,
                payload: { isDefault: !isDefault },
            });

            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "success",
                message: NOTIFICATION_MESSAGES.settings.channelUpdated.message,
                description: isDefault ? "Default channel removed." : "Default channel set.",
                key: actionKey,
                requestId,
            });
        } catch (error) {
            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.settings.channelUpdateFailed.message,
                description: normalizeUserError(error, "Failed to update channel"),
                key: actionKey,
                requestId,
            });
        }
    };

    const onToggleChannelActive = async (channelId: string, isActive: boolean) => {
        const actionKey = `settings:channels:update-active:${channelId}`;
        const requestId = createNotificationRequestId();
        requestTracker.markLatest(actionKey, requestId);

        try {
            await updateChannelMutation.mutateAsync({
                id: channelId,
                payload: { isActive: !isActive },
            });

            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "success",
                message: NOTIFICATION_MESSAGES.settings.channelUpdated.message,
                description: isActive ? "Channel paused." : "Channel activated.",
                key: actionKey,
                requestId,
            });
        } catch (error) {
            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.settings.channelUpdateFailed.message,
                description: normalizeUserError(error, "Failed to update channel"),
                key: actionKey,
                requestId,
            });
        }
    };

    const onRemoveChannel = async (channelId: string) => {
        const actionKey = `settings:channels:delete:${channelId}`;
        const requestId = createNotificationRequestId();
        requestTracker.markLatest(actionKey, requestId);

        try {
            await deleteChannelMutation.mutateAsync(channelId);

            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "success",
                message: NOTIFICATION_MESSAGES.settings.channelRemoved.message,
                description: "Notification channel removed.",
                key: actionKey,
                requestId,
            });
        } catch (error) {
            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.settings.channelRemoveFailed.message,
                description: normalizeUserError(error, "Failed to remove channel"),
                key: actionKey,
                requestId,
            });
        }
    };

    return {
        channelsQuery,
        newChannelEmail,
        isCreatePending: createChannelMutation.isPending,
        setNewChannelEmail,
        onCreateChannel,
        onToggleChannelDefault,
        onToggleChannelActive,
        onRemoveChannel,
    };
};
