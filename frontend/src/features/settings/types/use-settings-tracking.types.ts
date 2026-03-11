import type { CategoryTreeNode } from "../../categories/types/category-tree-node";
import type { useCategoriesQuery } from "../../categories/queries";
import type { useSubscriptionsQuery, useTrackedProductsQuery } from "../queries";
import type { CategoryOption } from "../../categories/types/category-option";

export interface UseSettingsTrackingResult {
    categoriesQuery: ReturnType<typeof useCategoriesQuery>;
    subscriptionsQuery: ReturnType<typeof useSubscriptionsQuery>;
    trackedProductsQuery: ReturnType<typeof useTrackedProductsQuery>;
    categoryOptions: CategoryOption[];
    availableCategoryOptions: CategoryOption[];
    availableCategoryTreeData: CategoryTreeNode[];
    categoryLabelById: Map<string, string>;
    selectedCategoryId: string;
    effectiveSelectedCategoryId: string;
    trackingError: string | null;
    isCreatePending: boolean;
    isDeletePending: boolean;
    isUntrackProductPending: boolean;
    setSelectedCategoryId: (categoryId: string) => void;
    onTrackCategory: () => Promise<void>;
    onUntrackCategory: (subscriptionId: string) => Promise<void>;
    onUntrackProduct: (productId: string, productName: string) => Promise<void>;
}
