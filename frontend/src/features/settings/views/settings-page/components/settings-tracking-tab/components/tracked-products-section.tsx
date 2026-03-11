import { CloseCircleOutlined } from "@ant-design/icons";
import { AppButton } from "../../../../../../../components/app-button/AppButton";
import type { TrackedProductData } from "../../../../../types/settings-schema.types";
import styles from "../../../../../components/settings-shared.module.scss";

interface TrackedProductsSectionProps {
    trackedProducts: TrackedProductData[];
    trackedProductsError: string | null;
    isTrackedProductsLoading: boolean;
    isUntrackProductPending: boolean;
    onRetryTrackedProducts: () => void;
    onUntrackProduct: (productId: string, productName: string) => void;
}

export const TrackedProductsSection = ({
    trackedProducts,
    trackedProductsError,
    isTrackedProductsLoading,
    isUntrackProductPending,
    onRetryTrackedProducts,
    onUntrackProduct,
}: TrackedProductsSectionProps) => (
    <article className={styles.card}>
        <div className={styles.sectionHeader}>
            <h3 className={styles.cardTitle}>Tracked products</h3>
        </div>
        {isTrackedProductsLoading ? (
            <p className={styles.emptyState}>Loading tracked products...</p>
        ) : trackedProductsError ? (
            <div className={styles.stack}>
                <p className={styles.errorText}>{trackedProductsError}</p>
                <AppButton intent="secondary" size="small" onClick={onRetryTrackedProducts}>
                    Retry
                </AppButton>
            </div>
        ) : trackedProducts.length === 0 ? (
            <p className={styles.emptyState}>No tracked products yet.</p>
        ) : (
            <div className={styles.list}>
                {trackedProducts.map((item) => (
                    <div key={item.id} className={styles.listItem}>
                        <div>
                            <strong>{item.product.name}</strong>
                            <div className={styles.subtle}>{item.product.externalUrl}</div>
                        </div>
                        <AppButton
                            intent="danger"
                            icon={<CloseCircleOutlined aria-hidden />}
                            onClick={() => void onUntrackProduct(item.productId, item.product.name)}
                            disabled={isUntrackProductPending}
                        >
                            Stop tracking
                        </AppButton>
                    </div>
                ))}
            </div>
        )}
    </article>
);
