import type { UserRole } from "@mabrik/shared";
import { useMemo, useState } from "react";
import type { NotificationChannelCreateRequest } from "@mabrik/shared";
import {
    useConfirmTelegramLinkMutation,
    useCreateNotificationChannelMutation,
    useDeleteNotificationChannelMutation,
    useStartTelegramLinkMutation,
    useUpdateNotificationChannelMutation,
} from "../mutations";
import { useNotificationChannelsQuery, useTelegramLinkStatusQuery } from "../queries";
import type { UseSettingsNotificationsResult } from "../types/use-settings-notifications.types";
import { NOTIFICATION_MESSAGES } from "../../../shared/constants/notification-messages";
import { useAppNotification } from "../../../shared/hooks/use-app-notification";
import { createNotificationRequestId } from "../../../shared/notifications/request-id";
import { createNotificationRequestTracker } from "../../../shared/notifications/request-tracker";
import { normalizeUserError } from "../../../shared/utils/normalize-user-error";

export const useSettingsNotifications = (role: UserRole): UseSettingsNotificationsResult => {
    const isTelegramAvailable = role !== "free";
    const channelsQuery = useNotificationChannelsQuery();
    const telegramLinkStatusQuery = useTelegramLinkStatusQuery(isTelegramAvailable);
    const createChannelMutation = useCreateNotificationChannelMutation();
    const updateChannelMutation = useUpdateNotificationChannelMutation();
    const deleteChannelMutation = useDeleteNotificationChannelMutation();
    const startTelegramLinkMutation = useStartTelegramLinkMutation();
    const confirmTelegramLinkMutation = useConfirmTelegramLinkMutation();
    const { notify } = useAppNotification();
    const [newChannelEmail, setNewChannelEmail] = useState("");
    const [telegramDeepLinkUrl, setTelegramDeepLinkUrl] = useState<string | null>(null);
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

    const onStartTelegramLink = async () => {
        const actionKey = "settings:channels:telegram:start";
        const requestId = createNotificationRequestId();
        requestTracker.markLatest(actionKey, requestId);

        try {
            const result = await startTelegramLinkMutation.mutateAsync();

            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            setTelegramDeepLinkUrl(result.deepLinkUrl);
            notify({
                variant: "success",
                message: "Telegram linking started",
                description: "Open Telegram and send /start in the bot chat, then confirm below.",
                key: actionKey,
                requestId,
            });
        } catch (error) {
            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "error",
                message: "Could not start Telegram linking",
                description: normalizeUserError(error, "Failed to create Telegram link"),
                key: actionKey,
                requestId,
            });
        }
    };

    const onRefreshTelegramLinkStatus = async () => {
        if (!isTelegramAvailable) {
            return;
        }

        const actionKey = "settings:channels:telegram:refresh";
        const requestId = createNotificationRequestId();
        requestTracker.markLatest(actionKey, requestId);

        try {
            await telegramLinkStatusQuery.refetch({ throwOnError: true });

            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "success",
                message: "Telegram status refreshed",
                key: actionKey,
                requestId,
            });
        } catch (error) {
            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "error",
                message: "Could not refresh Telegram status",
                description: normalizeUserError(error, "Failed to fetch Telegram link status"),
                key: actionKey,
                requestId,
            });
        }
    };

    const onConfirmTelegramLink = async () => {
        if (!isTelegramAvailable) {
            return;
        }

        const actionKey = "settings:channels:telegram:confirm";
        const requestId = createNotificationRequestId();
        requestTracker.markLatest(actionKey, requestId);
        const challengeId = telegramLinkStatusQuery.data?.challengeId;

        if (!challengeId) {
            notify({
                variant: "warning",
                message: "Telegram is not ready to confirm",
                description: "Start linking in Telegram first, then refresh status.",
                key: actionKey,
                requestId,
            });
            return;
        }

        try {
            const result = await confirmTelegramLinkMutation.mutateAsync({ challengeId });

            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            setTelegramDeepLinkUrl(null);
            notify({
                variant: result.verificationMessage.status === "sent" ? "success" : "warning",
                message: "Telegram connected",
                description: result.verificationMessage.warning ?? "You will now receive alerts through Telegram.",
                key: actionKey,
                requestId,
            });
        } catch (error) {
            if (!requestTracker.isLatest(actionKey, requestId)) {
                return;
            }

            notify({
                variant: "error",
                message: "Could not confirm Telegram link",
                description: normalizeUserError(error, "Failed to confirm Telegram channel"),
                key: actionKey,
                requestId,
            });
        }
    };

    return {
        isTelegramAvailable,
        channelsQuery,
        telegramLinkStatusQuery,
        telegramDeepLinkUrl: isTelegramAvailable ? telegramDeepLinkUrl : null,
        newChannelEmail,
        isCreatePending: createChannelMutation.isPending,
        isStartTelegramPending: startTelegramLinkMutation.isPending,
        isConfirmTelegramPending: confirmTelegramLinkMutation.isPending,
        setNewChannelEmail,
        onCreateChannel,
        onStartTelegramLink,
        onRefreshTelegramLinkStatus,
        onConfirmTelegramLink,
        onToggleChannelDefault,
        onToggleChannelActive,
        onRemoveChannel,
    };
};
