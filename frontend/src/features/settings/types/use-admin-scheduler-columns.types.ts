import type { AdminSchedulerStateItemData } from "./settings-schema.types";
import type { AdminSchedulerSortBy, AdminSchedulerSortOrder } from "./admin-scheduler-sort.types";

export interface UseAdminSchedulerColumnsOptions {
    sortBy: AdminSchedulerSortBy;
    sortOrder: AdminSchedulerSortOrder;
    onToggleSort: (nextSortBy: AdminSchedulerSortBy) => void;
    onEditInterval: (categoryId: string) => void;
    onTriggerRun: (categoryId: string) => void;
    getTriggerDisabledReason: (item: AdminSchedulerStateItemData) => string | null;
    isTriggeringRun: boolean;
    statusBadgeClassName: string;
    actionRowClassName: string;
}
