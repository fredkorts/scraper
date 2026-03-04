import { ROLE_LABELS } from "../constants/settings.constants";
import { getSettingsPanelId, getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import type { SettingsAccountTabProps } from "../types/settings-ui.types";
import styles from "../../../routes/settings-page.module.scss";

export const SettingsAccountTab = ({
    form,
    email,
    isActive,
    isSaving,
    role,
    onSubmitProfile,
}: SettingsAccountTabProps) => (
    <section
        id={getSettingsPanelId("account")}
        className={styles.section}
        role="tabpanel"
        aria-labelledby={getSettingsTabId("account")}
    >
        <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Account Basics</h2>
        </div>
        <form className={styles.card} onSubmit={onSubmitProfile}>
            <label className={styles.field}>
                <span className={styles.label}>Name</span>
                <input className={styles.input} {...form.register("name")} />
                {form.formState.errors.name ? (
                    <span className={styles.errorText}>{form.formState.errors.name.message}</span>
                ) : null}
            </label>
            <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input className={styles.input} value={email} readOnly />
                <span className={styles.subtle}>Email changes are not available in Phase 5.</span>
            </label>
            <div className={styles.metaGrid}>
                <div>
                    <span className={styles.eyebrow}>Role</span>
                    <div>{ROLE_LABELS[role]}</div>
                </div>
                <div>
                    <span className={styles.eyebrow}>Account status</span>
                    <div>{isActive ? "Active" : "Inactive"}</div>
                </div>
            </div>
            <button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
            </button>
        </form>
    </section>
);
