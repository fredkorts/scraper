import type { useNotificationChannelsQuery } from "../queries";

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
