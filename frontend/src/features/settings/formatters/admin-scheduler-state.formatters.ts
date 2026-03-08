import { formatDateTime, formatStatusLabel } from "../../../shared/formatters/display";
import {
    SCHEDULER_ELIGIBILITY_LABELS,
    SCHEDULER_QUEUE_STATUS_LABELS,
} from "../constants/admin-scheduler-state.constants";
import type { AdminSchedulerStateItemData } from "../types/settings-schema.types";

export const formatEligibilityStatusLabel = (status: AdminSchedulerStateItemData["eligibilityStatus"]): string =>
    SCHEDULER_ELIGIBILITY_LABELS[status];

export const formatQueueStatusLabel = (status: AdminSchedulerStateItemData["queueStatus"]): string =>
    SCHEDULER_QUEUE_STATUS_LABELS[status];

export const formatLastRunLabel = (item: AdminSchedulerStateItemData): string => {
    if (!item.lastRunAt || !item.lastRunStatus) {
        return "-";
    }

    return `${formatDateTime(item.lastRunAt)} (${formatStatusLabel(item.lastRunStatus)})`;
};
