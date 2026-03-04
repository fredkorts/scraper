import { getSettingsPanelId, getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import type { SettingsNotificationsTabProps } from "../types/settings-ui.types";
import styles from "../../../routes/settings-page.module.scss";

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
                <button
                    type="button"
                    onClick={() => void onCreateChannel()}
                    disabled={!newChannelEmail || isCreatePending}
                >
                    {isCreatePending ? "Adding..." : "Add channel"}
                </button>
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
                            <button
                                type="button"
                                onClick={() => void onToggleChannelDefault(channel.id, channel.isDefault)}
                            >
                                {channel.isDefault ? "Unset default" : "Make default"}
                            </button>
                            <button
                                type="button"
                                onClick={() => void onToggleChannelActive(channel.id, channel.isActive)}
                            >
                                {channel.isActive ? "Disable" : "Enable"}
                            </button>
                            <button type="button" onClick={() => void onRemoveChannel(channel.id)}>
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </article>
    </section>
);
