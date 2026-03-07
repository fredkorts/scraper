import { PlusOutlined } from "@ant-design/icons";
import { AppButton } from "../../../components/app-button/AppButton";
import { getSettingsPanelId, getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import type { SettingsNotificationsTabProps } from "../types/settings-ui.types";
import styles from "./settings-shared.module.scss";

export const SettingsNotificationsTab = ({
    channels,
    newChannelEmail,
    role,
    isCreatePending,
    onSetNewChannelEmail,
    onCreateChannel,
    onToggleChannelDefault,
    onToggleChannelActive,
    onRemoveChannel,
}: SettingsNotificationsTabProps) => (
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
                    <input
                        className={styles.input}
                        type="email"
                        value={newChannelEmail}
                        onChange={(event) => onSetNewChannelEmail(event.target.value)}
                    />
                </label>
                <AppButton
                    aria-label="Add channel"
                    className={styles.successPrimaryButton}
                    icon={<PlusOutlined />}
                    intent="primary"
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
            <h3 className={styles.cardTitle}>Current channels</h3>
            <div className={styles.list}>
                {channels.map((channel) => (
                    <div key={channel.id} className={styles.listItem}>
                        <div>
                            <strong>{channel.destination}</strong>
                            <div className={styles.subtle}>
                                {channel.isDefault ? "Default" : "Secondary"} ·{" "}
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
