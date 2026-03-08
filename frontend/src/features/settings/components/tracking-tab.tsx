import { CloseCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { AppButton } from "../../../components/app-button/AppButton";
import { CategoryTreeSelect } from "../../../features/categories/components/category-tree-select";
import { getRoleLimitLabel, getTrackingRoleDescription } from "../constants/settings.constants";
import { getSettingsPanelId, getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import type { SettingsTrackingTabProps } from "../types/settings-ui.types";
import styles from "./settings-shared.module.scss";

export const SettingsTrackingTab = ({
    availableCategoryOptions,
    availableCategoryTreeData,
    categoryLabelById,
    role,
    selectedCategoryId,
    subscriptions,
    trackingError,
    isCreatePending,
    isDeletePending,
    onSelectCategory,
    onTrackCategory,
    onUntrackCategory,
}: SettingsTrackingTabProps) => (
    <section
        id={getSettingsPanelId("tracking")}
        className={styles.section}
        role="tabpanel"
        aria-labelledby={getSettingsTabId("tracking")}
    >
        <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Tracking</h2>
        </div>
        <article className={styles.card}>
            <span className={styles.eyebrow}>Usage</span>
            <strong>{getRoleLimitLabel(subscriptions.used, subscriptions.limit)}</strong>
            <span className={styles.subtle}>{getTrackingRoleDescription(role)}</span>
        </article>
        <article className={styles.card}>
            <div className={styles.sectionHeader}>
                <h3 className={styles.cardTitle}>Tracked categories</h3>
            </div>
            {subscriptions.items.length === 0 ? (
                <p className={styles.emptyState}>You are not tracking any categories yet.</p>
            ) : (
                <div className={styles.list}>
                    {subscriptions.items.map((item) => (
                        <div key={item.id} className={styles.listItem}>
                            <div>
                                <strong>{categoryLabelById.get(item.category.id) ?? item.category.nameEt}</strong>
                                <div className={styles.subtle}>{item.category.slug}</div>
                            </div>
                            <AppButton
                                intent="danger"
                                icon={<CloseCircleOutlined aria-hidden />}
                                onClick={() => void onUntrackCategory(item.id)}
                                disabled={isDeletePending}
                            >
                                Stop tracking
                            </AppButton>
                        </div>
                    ))}
                </div>
            )}
        </article>
        <article className={styles.card}>
            <h3 className={styles.cardTitle}>Track a new category</h3>
            <div className={styles.trackingCreateRow}>
                <label className={styles.field}>
                    <span className={styles.label}>Available categories</span>
                    <CategoryTreeSelect
                        ariaLabel="Available categories"
                        className={styles.select}
                        disabled={!availableCategoryOptions.length}
                        treeData={availableCategoryTreeData}
                        value={selectedCategoryId || undefined}
                        onChange={(value) => onSelectCategory(value ?? "")}
                    />
                </label>
                <AppButton
                    className={styles.trackingCreateButton}
                    intent="success"
                    icon={<PlusOutlined aria-hidden />}
                    size="large"
                    onClick={() => void onTrackCategory()}
                    isLoading={isCreatePending}
                    disabled={!availableCategoryOptions.length || isCreatePending}
                >
                    Track category
                </AppButton>
            </div>
            {trackingError ? <p className={styles.errorText}>{trackingError}</p> : null}
            {!availableCategoryOptions.length ? (
                <p className={styles.subtle}>
                    No additional categories are available for tracking under your current plan.
                </p>
            ) : null}
        </article>
    </section>
);
