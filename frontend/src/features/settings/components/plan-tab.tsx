import { ROLE_LABELS, getNotificationModeLabel } from "../constants/settings.constants";
import { getSettingsPanelId, getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import type { SettingsPlanTabProps } from "../types/settings-ui.types";
import styles from "./settings-shared.module.scss";

export const SettingsPlanTab = ({ role, subscriptions }: SettingsPlanTabProps) => (
    <section
        id={getSettingsPanelId("plan")}
        className={styles.section}
        role="tabpanel"
        aria-labelledby={getSettingsTabId("plan")}
    >
        <article className={styles.card}>
            <h2 className={styles.sectionTitle}>Plan</h2>
            <p className={styles.planHeadline}>You are on the {ROLE_LABELS[role]} plan.</p>
            <div className={styles.list}>
                <div className={styles.listItem}>
                    <span>Category tracking</span>
                    <strong>
                        {subscriptions.limit === null ? "Unlimited" : `Up to ${subscriptions.limit} categories`}
                    </strong>
                </div>
                <div className={styles.listItem}>
                    <span>Notifications</span>
                    <strong>{getNotificationModeLabel(role)}</strong>
                </div>
                {role === "free" ? (
                    <div className={styles.listItem}>
                        <span>Upgrade</span>
                        <strong>Upgrade flow arrives in Phase 6</strong>
                    </div>
                ) : null}
            </div>
        </article>
    </section>
);
