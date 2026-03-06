import type { ScrapeInterval } from "@mabrik/shared";
import type { CategoryTreeNode } from "../../categories/types/category-tree-node";
import type { useCategoriesQuery } from "../../categories/queries";
import type { useTriggerRunMutation } from "../mutations";

export interface UseSettingsAdminResult {
    categoriesQuery: ReturnType<typeof useCategoriesQuery>;
    categoryTreeData: CategoryTreeNode[];
    selectedCategoryId: string;
    selectedScrapeInterval: ScrapeInterval;
    triggerRunResult: ReturnType<typeof useTriggerRunMutation>["data"];
    isSavingInterval: boolean;
    isTriggeringRun: boolean;
    setSelectedCategoryId: (categoryId: string) => void;
    setSelectedScrapeInterval: (scrapeInterval: ScrapeInterval) => void;
    onSaveScrapeInterval: () => Promise<void>;
    onTriggerRun: () => Promise<void>;
}
