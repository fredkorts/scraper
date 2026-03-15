import { PlusOutlined } from "@ant-design/icons";
import { AppButton } from "../../../components/app-button/AppButton";
import { AppInput } from "../../../components/app-input/AppInput";
import { InfoTooltip } from "../../../components/info-tooltip/InfoTooltip";
import { getSettingsPanelId, getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import type { SettingsNotificationsTabProps } from "../types/settings-ui.types";
import styles from "./settings-shared.module.scss";

const getTelegramStatusLabel = (status: SettingsNotificationsTabProps["telegramLinkStatus"]) => {
    if (!status) {
        return "Status unavailable";
    }

    switch (status.status) {
        case "none":
            return "Not connected";
        case "awaiting_telegram":
            return "Waiting for /start in Telegram";
        case "awaiting_confirmation":
            return "Ready to confirm";
        case "expired":
            return "Link expired";
        case "connected":
            return "Connected";
        default:
            return "Status unavailable";
    }
};

export const SettingsNotificationsTab = ({
    channels,
    newChannelEmail,
    role,
    isTelegramAvailable,
    telegramLinkStatus,
    telegramDeepLinkUrl,
    isTelegramLinkStatusLoading,
    telegramLinkStatusError,
    isCreatePending,
    isStartTelegramPending,
    isConfirmTelegramPending,
    onSetNewChannelEmail,
    onCreateChannel,
    onStartTelegramLink,
    onRefreshTelegramLinkStatus,
    onConfirmTelegramLink,
    onToggleChannelDefault,
    onToggleChannelActive,
    onRemoveChannel,
}: SettingsNotificationsTabProps) => {
    const canConfirmTelegram =
        telegramLinkStatus?.status === "awaiting_confirmation" && Boolean(telegramLinkStatus.challengeId);
    const telegramStatusLabel = getTelegramStatusLabel(telegramLinkStatus);
    const hasTelegramConnectedChannel = channels.some(
        (channel) => channel.channelType === "telegram" && channel.isActive,
    );

    return (
        <section
            id={getSettingsPanelId("notifications")}
            className={styles.section}
            role="tabpanel"
            aria-labelledby={getSettingsTabId("notifications")}
        >
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Notification Channels</h2>
            </div>
            <article className={styles.card}>
                <h3 className={styles.cardTitle}>Add email channel</h3>
                <div className={styles.inlineForm}>
                    <label className={styles.field}>
                        <span className={styles.label}>Email</span>
                        <AppInput
                            className={styles.input}
                            type="email"
                            value={newChannelEmail}
                            onChange={(event) => onSetNewChannelEmail(event.target.value)}
                        />
                    </label>
                    <AppButton
                        aria-label="Add channel"
                        icon={<PlusOutlined />}
                        intent="success"
                        size="large"
                        isLoading={isCreatePending}
                        onClick={() => void onCreateChannel()}
                        disabled={!newChannelEmail}
                    >
                        Add channel
                    </AppButton>
                </div>
                <p className={styles.subtle}>
                    {role === "free"
                        ? "Free users receive digest email delivery."
                        : "Paid and admin users receive immediate email delivery."}
                </p>
            </article>
            <article className={styles.card}>
                <div className={styles.cardHeadingRow}>
                    <h3 className={styles.cardTitle}>Telegram</h3>
                    <InfoTooltip
                        ariaLabel="Telegram connection help"
                        content="Connect flow: click Connect Telegram, open Telegram from the link, send /start, then refresh and confirm."
                    />
                </div>
                {!isTelegramAvailable ? (
                    <p className={styles.subtle}>Telegram alerts are available on paid and admin plans.</p>
                ) : (
                    <>
                        <p className={styles.subtle}>
                            Status: <strong>{telegramStatusLabel}</strong>
                            {telegramLinkStatus?.telegramAccountPreview
                                ? ` (${telegramLinkStatus.telegramAccountPreview})`
                                : null}
                        </p>
                        {telegramLinkStatus?.expiresAt ? (
                            <p className={styles.subtle}>
                                Challenge expires at {new Date(telegramLinkStatus.expiresAt).toLocaleString()}.
                            </p>
                        ) : null}
                        {telegramLinkStatusError ? <p className={styles.errorText}>{telegramLinkStatusError}</p> : null}
                        {hasTelegramConnectedChannel ? (
                            <p className={styles.subtle}>Telegram channel is active in your delivery channels list.</p>
                        ) : null}
                        <div className={styles.actionRow}>
                            <AppButton
                                intent="secondary"
                                onClick={() => void onStartTelegramLink()}
                                isLoading={isStartTelegramPending}
                            >
                                {telegramLinkStatus?.status === "connected" ? "Relink Telegram" : "Connect Telegram"}
                            </AppButton>
                            <AppButton
                                intent="secondary"
                                href={telegramDeepLinkUrl ?? undefined}
                                target="_blank"
                                rel="noreferrer"
                                disabled={!telegramDeepLinkUrl}
                            >
                                Open Telegram
                            </AppButton>
                            <AppButton
                                intent="secondary"
                                isLoading={isTelegramLinkStatusLoading}
                                onClick={() => void onRefreshTelegramLinkStatus()}
                            >
                                Refresh status
                            </AppButton>
                            <AppButton
                                intent="success"
                                isLoading={isConfirmTelegramPending}
                                onClick={() => void onConfirmTelegramLink()}
                                disabled={!canConfirmTelegram}
                            >
                                Confirm Telegram
                            </AppButton>
                        </div>
                    </>
                )}
            </article>
            <article className={styles.card}>
                <h3 className={styles.cardTitle}>Current channels</h3>
                <div className={styles.list}>
                    {channels.map((channel) => (
                        <div key={channel.id} className={styles.listItem}>
                            <div>
                                <strong>{channel.destination}</strong>
                                <div className={styles.subtle}>
                                    {channel.channelType} · {channel.isDefault ? "Default" : "Secondary"} ·{" "}
                                    {channel.isActive ? "Active" : "Inactive"}
                                </div>
                            </div>
                            <div className={styles.actionRow}>
                                <AppButton
                                    intent="secondary"
                                    onClick={() => void onToggleChannelDefault(channel.id, channel.isDefault)}
                                >
                                    {channel.isDefault ? "Unset default" : "Make default"}
                                </AppButton>
                                <AppButton
                                    intent="secondary"
                                    onClick={() => void onToggleChannelActive(channel.id, channel.isActive)}
                                >
                                    {channel.isActive ? "Disable" : "Enable"}
                                </AppButton>
                                <AppButton intent="danger" onClick={() => void onRemoveChannel(channel.id)}>
                                    Remove
                                </AppButton>
                            </div>
                        </div>
                    ))}
                </div>
            </article>
        </section>
    );
};
