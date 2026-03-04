import { useState } from "react";
import type { NotificationChannelCreateRequest } from "@mabrik/shared";
import {
    useCreateNotificationChannelMutation,
    useDeleteNotificationChannelMutation,
    useUpdateNotificationChannelMutation,
} from "../mutations";
import { useNotificationChannelsQuery } from "../queries";

export interface UseSettingsNotificationsResult {
    channelsQuery: ReturnType<typeof useNotificationChannelsQuery>;
    newChannelEmail: string;
    isCreatePending: boolean;
    setNewChannelEmail: (value: string) => void;
    onCreateChannel: () => Promise<void>;
    onToggleChannelDefault: (channelId: string, isDefault: boolean) => Promise<void>;
    onToggleChannelActive: (channelId: string, isActive: boolean) => Promise<void>;
    onRemoveChannel: (channelId: string) => Promise<void>;
}

export const useSettingsNotifications = (): UseSettingsNotificationsResult => {
    const channelsQuery = useNotificationChannelsQuery();
    const createChannelMutation = useCreateNotificationChannelMutation();
    const updateChannelMutation = useUpdateNotificationChannelMutation();
    const deleteChannelMutation = useDeleteNotificationChannelMutation();
    const [newChannelEmail, setNewChannelEmail] = useState("");

    const onCreateChannel = async () => {
        const payload: NotificationChannelCreateRequest = {
            channelType: "email",
            destination: newChannelEmail,
        };

        await createChannelMutation.mutateAsync(payload);
        setNewChannelEmail("");
    };

    const onToggleChannelDefault = async (channelId: string, isDefault: boolean) => {
        await updateChannelMutation.mutateAsync({
            id: channelId,
            payload: { isDefault: !isDefault },
        });
    };

    const onToggleChannelActive = async (channelId: string, isActive: boolean) => {
        await updateChannelMutation.mutateAsync({
            id: channelId,
            payload: { isActive: !isActive },
        });
    };

    const onRemoveChannel = async (channelId: string) => {
        await deleteChannelMutation.mutateAsync(channelId);
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
