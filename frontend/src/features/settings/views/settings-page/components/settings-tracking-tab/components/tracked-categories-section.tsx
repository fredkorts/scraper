import { CloseCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { AppButton } from "../../../../../../../components/app-button/AppButton";
import { CategoryTreeSelect } from "../../../../../../categories";
import type { CategoryOption } from "../../../../../../categories";
import type { CategoryTreeNode } from "../../../../../../categories";
import styles from "../../../../../components/settings-shared.module.scss";

interface TrackedCategoriesSectionProps {
    availableCategoryOptions: CategoryOption[];
    availableCategoryTreeData: CategoryTreeNode[];
    categoryLabelById: Map<string, string>;
    selectedCategoryId: string;
    subscriptionItems: Array<{
        id: string;
        category: {
            id: string;
            nameEt: string;
            slug: string;
        };
    }>;
    trackingError: string | null;
    isCreatePending: boolean;
    isDeletePending: boolean;
    onSelectCategory: (categoryId: string) => void;
    onTrackCategory: () => void;
    onUntrackCategory: (subscriptionId: string) => void;
}

export const TrackedCategoriesSection = ({
    availableCategoryOptions,
    availableCategoryTreeData,
    categoryLabelById,
    selectedCategoryId,
    subscriptionItems,
    trackingError,
    isCreatePending,
    isDeletePending,
    onSelectCategory,
    onTrackCategory,
    onUntrackCategory,
}: TrackedCategoriesSectionProps) => (
    <>
        <article className={styles.card}>
            <div className={styles.sectionHeader}>
                <h3 className={styles.cardTitle}>Tracked categories</h3>
            </div>
            {subscriptionItems.length === 0 ? (
                <p className={styles.emptyState}>You are not tracking any categories yet.</p>
            ) : (
                <div className={styles.list}>
                    {subscriptionItems.map((item) => (
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
    </>
);
