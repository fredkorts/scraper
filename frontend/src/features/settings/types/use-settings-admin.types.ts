import type { ScrapeInterval } from "@mabrik/shared";
import type { CategoryTreeNode } from "../../categories/types/category-tree-node";
import type { useAdminSchedulerStateQuery } from "../queries";
import type { useTriggerRunMutation } from "../mutations";
import type { AdminSchedulerStateItemData } from "./settings-schema.types";

export interface UseSettingsAdminResult {
    schedulerStateQuery: ReturnType<typeof useAdminSchedulerStateQuery>;
    schedulerStateItems: AdminSchedulerStateItemData[];
    schedulerStateCategoryTreeData: CategoryTreeNode[];
    triggerCategoryTreeData: CategoryTreeNode[];
    schedulerStateGeneratedAt?: string;
    selectedIntervalCategoryId: string;
    selectedTriggerCategoryId: string;
    selectedScrapeInterval: ScrapeInterval;
    triggerRunResult: ReturnType<typeof useTriggerRunMutation>["data"];
    isSavingInterval: boolean;
    isTriggeringRun: boolean;
    setSelectedIntervalCategoryId: (categoryId: string) => void;
    setSelectedTriggerCategoryId: (categoryId: string) => void;
    setSelectedScrapeInterval: (scrapeInterval: ScrapeInterval) => void;
    prefillIntervalFromTable: (categoryId: string) => void;
    onSaveScrapeInterval: () => Promise<void>;
    onTriggerRun: (categoryId?: string) => Promise<void>;
    getTriggerDisabledReason: (item: AdminSchedulerStateItemData | undefined) => string | null;
    getTriggerDisabledReasonByCategoryId: (categoryId: string) => string | null;
}
