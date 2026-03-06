import {
    ROLE_LABELS,
    getNotificationModeLabel,
    getRoleLimitLabel,
} from "../constants/settings.constants";
import type { SettingsSummaryProps } from "../types/settings-ui.types";
import styles from "./settings-shared.module.scss";

export const SettingsSummary = ({ email, name, role, subscriptions }: SettingsSummaryProps) => (
    <section className={styles.summaryShell} aria-label="Settings summary">
        <article className={styles.summaryCard}>
            <span className={styles.eyebrow}>User</span>
            <strong>{name}</strong>
            <span className={styles.subtle}>{email}</span>
        </article>
        <article className={styles.summaryCard}>
            <span className={styles.eyebrow}>Plan</span>
            <strong>{ROLE_LABELS[role]}</strong>
            <span className={styles.subtle}>{getNotificationModeLabel(role)}</span>
        </article>
        <article className={styles.summaryCard}>
            <span className={styles.eyebrow}>Tracking</span>
            <strong>{getRoleLimitLabel(subscriptions.used, subscriptions.limit)}</strong>
            <span className={styles.subtle}>
                {subscriptions.limit === null
                    ? "Unlimited category tracking"
                    : `${subscriptions.remaining ?? 0} slots remaining`}
            </span>
        </article>
        <article className={styles.summaryCard}>
            <span className={styles.eyebrow}>Notification mode</span>
            <strong>{role === "free" ? "Digest" : "Immediate"}</strong>
            <span className={styles.subtle}>{getNotificationModeLabel(role)}</span>
        </article>
    </section>
);
