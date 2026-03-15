import type { useNotificationChannelsQuery, useTelegramLinkStatusQuery } from "../queries";

export interface UseSettingsNotificationsResult {
    isTelegramAvailable: boolean;
    channelsQuery: ReturnType<typeof useNotificationChannelsQuery>;
    telegramLinkStatusQuery: ReturnType<typeof useTelegramLinkStatusQuery>;
    telegramDeepLinkUrl: string | null;
    newChannelEmail: string;
    isCreatePending: boolean;
    isStartTelegramPending: boolean;
    isConfirmTelegramPending: boolean;
    setNewChannelEmail: (value: string) => void;
    onCreateChannel: () => Promise<void>;
    onStartTelegramLink: () => Promise<void>;
    onRefreshTelegramLinkStatus: () => Promise<void>;
    onConfirmTelegramLink: () => Promise<void>;
    onToggleChannelDefault: (channelId: string, isDefault: boolean) => Promise<void>;
    onToggleChannelActive: (channelId: string, isActive: boolean) => Promise<void>;
    onRemoveChannel: (channelId: string) => Promise<void>;
}
