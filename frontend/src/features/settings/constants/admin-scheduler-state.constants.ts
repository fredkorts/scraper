import type { AppSelectOption } from "../../../components/app-select/AppSelect";
import type { ScrapeStatus, SchedulerEligibilityStatus, SchedulerQueueStatus } from "@mabrik/shared";

export const SCHEDULER_ELIGIBILITY_LABELS: Record<SchedulerEligibilityStatus, string> = {
    eligible: "Eligible",
    inactive_category: "Inactive",
    no_active_subscribers: "None",
    not_due_yet: "Not due yet",
};

export const SCHEDULER_QUEUE_STATUS_LABELS: Record<SchedulerQueueStatus, string> = {
    idle: "Idle",
    queued: "Queued",
    active: "Active",
};

export const SCHEDULER_LAST_RUN_STATUS_TONES: Record<ScrapeStatus, "neutral" | "info" | "success" | "danger"> = {
    pending: "neutral",
    running: "info",
    completed: "success",
    failed: "danger",
};

export const SCHEDULER_TABLE_PAGE_SIZE_OPTIONS: AppSelectOption[] = [
    { label: "10", value: "10" },
    { label: "25", value: "25" },
    { label: "50", value: "50" },
];

export const DEFAULT_SCHEDULER_TABLE_PAGE_SIZE = 10;
