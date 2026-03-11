import type { UserRole } from "@mabrik/shared";
import type { CategoryOption } from "../../../../../categories";
import type { CategoryTreeNode } from "../../../../../categories";
import type { SubscriptionsData, TrackedProductData } from "../../../../types/settings-schema.types";

export interface SettingsTrackingTabProps {
    availableCategoryOptions: CategoryOption[];
    availableCategoryTreeData: CategoryTreeNode[];
    categoryLabelById: Map<string, string>;
    role: UserRole;
    selectedCategoryId: string;
    subscriptions: SubscriptionsData;
    trackedProducts: TrackedProductData[];
    trackedProductsError: string | null;
    isTrackedProductsLoading: boolean;
    trackingError: string | null;
    isCreatePending: boolean;
    isDeletePending: boolean;
    isUntrackProductPending: boolean;
    canTrackProducts: boolean;
    onRetryTrackedProducts: () => void;
    onSelectCategory: (categoryId: string) => void;
    onTrackCategory: () => void;
    onUntrackCategory: (subscriptionId: string) => void;
    onUntrackProduct: (productId: string, productName: string) => void;
}
