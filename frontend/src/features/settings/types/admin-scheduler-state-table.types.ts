import type { AdminSchedulerStateItemData } from "./settings-schema.types";
import type { CategoryTreeNode } from "../../categories";

export interface AdminSchedulerStateTableProps {
    items: AdminSchedulerStateItemData[];
    categoryTreeData: CategoryTreeNode[];
    generatedAt?: string;
    isLoading: boolean;
    error: string | null;
    isTriggeringRun: boolean;
    onRetry: () => void;
    onEditInterval: (categoryId: string) => void;
    onTriggerRun: (categoryId: string) => void;
    getTriggerDisabledReason: (item: AdminSchedulerStateItemData) => string | null;
}
