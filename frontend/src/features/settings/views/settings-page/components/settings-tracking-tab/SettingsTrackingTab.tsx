import { getRoleLimitLabel, getTrackingRoleDescription } from "../../../../constants/settings.constants";
import { getSettingsPanelId, getSettingsTabId } from "../../../../constants/settings-tab-a11y.constants";
import { TrackedCategoriesSection } from "./components/tracked-categories-section";
import { TrackedProductsSection } from "./components/tracked-products-section";
import type { SettingsTrackingTabProps } from "./settings-tracking-tab.types";
import styles from "../../../../components/settings-shared.module.scss";

export const SettingsTrackingTab = ({
    availableCategoryOptions,
    availableCategoryTreeData,
    canTrackProducts,
    categoryLabelById,
    isTrackedProductsLoading,
    isUntrackProductPending,
    role,
    selectedCategoryId,
    subscriptions,
    trackedProducts,
    trackedProductsError,
    trackingError,
    isCreatePending,
    isDeletePending,
    onRetryTrackedProducts,
    onSelectCategory,
    onTrackCategory,
    onUntrackCategory,
    onUntrackProduct,
}: SettingsTrackingTabProps) => {
    const usedSlots = subscriptions.items.length + trackedProducts.length;
    const remainingSlots = subscriptions.limit === null ? null : Math.max(0, subscriptions.limit - usedSlots);

    return (
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
                <strong>{getRoleLimitLabel(usedSlots, subscriptions.limit)}</strong>
                <span className={styles.subtle}>
                    Categories: {subscriptions.items.length} | Products: {trackedProducts.length}
                    {remainingSlots === null ? "" : ` | Remaining: ${remainingSlots}`}
                </span>
                <span className={styles.subtle}>{getTrackingRoleDescription(role)}</span>
            </article>

            {canTrackProducts ? (
                <TrackedProductsSection
                    trackedProducts={trackedProducts}
                    trackedProductsError={trackedProductsError}
                    isTrackedProductsLoading={isTrackedProductsLoading}
                    isUntrackProductPending={isUntrackProductPending}
                    onRetryTrackedProducts={onRetryTrackedProducts}
                    onUntrackProduct={onUntrackProduct}
                />
            ) : null}

            <TrackedCategoriesSection
                availableCategoryOptions={availableCategoryOptions}
                availableCategoryTreeData={availableCategoryTreeData}
                categoryLabelById={categoryLabelById}
                selectedCategoryId={selectedCategoryId}
                subscriptionItems={subscriptions.items}
                trackingError={trackingError}
                isCreatePending={isCreatePending}
                isDeletePending={isDeletePending}
                onSelectCategory={onSelectCategory}
                onTrackCategory={onTrackCategory}
                onUntrackCategory={onUntrackCategory}
            />
        </section>
    );
};
