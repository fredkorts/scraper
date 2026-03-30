import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { SettingOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { AppButton } from "../../../components/app-button/AppButton";
import { SortHeader } from "../../../components/sort-header/SortHeader";
import { formatDateTime, formatStatusLabel } from "../../../shared/formatters/display";
import { ScrapeStatusLabel } from "../../../shared/components/scrape-status-label/ScrapeStatusLabel";
import { SCHEDULER_LAST_RUN_STATUS_TONES } from "../constants/admin-scheduler-state.constants";
import type { AdminSchedulerStateItemData } from "../types/settings-schema.types";
import type { UseAdminSchedulerColumnsOptions } from "../types/use-admin-scheduler-columns.types";

const columnHelper = createColumnHelper<AdminSchedulerStateItemData>();

export const useAdminSchedulerColumns = ({
    sortBy,
    sortOrder,
    onToggleSort,
    onEditInterval,
    onTriggerRun,
    getTriggerDisabledReason,
    isTriggeringRun,
    statusBadgeClassName,
    actionRowClassName,
}: UseAdminSchedulerColumnsOptions) =>
    useMemo(
        () =>
            [
                columnHelper.accessor("categoryNameEt", {
                    header: () => (
                        <SortHeader
                            label="Category"
                            isActive={sortBy === "categoryNameEt"}
                            order={sortOrder}
                            onToggle={() => onToggleSort("categoryNameEt")}
                        />
                    ),
                    cell: (info) => info.getValue(),
                }),
                columnHelper.accessor("scrapeIntervalHours", {
                    header: () => (
                        <SortHeader
                            label="Interval"
                            isActive={sortBy === "scrapeIntervalHours"}
                            order={sortOrder}
                            onToggle={() => onToggleSort("scrapeIntervalHours")}
                        />
                    ),
                    cell: (info) => `${info.getValue()}h`,
                }),
                columnHelper.accessor("activeSubscriberCount", {
                    header: () => (
                        <SortHeader
                            label="Subscribers"
                            isActive={sortBy === "activeSubscriberCount"}
                            order={sortOrder}
                            onToggle={() => onToggleSort("activeSubscriberCount")}
                        />
                    ),
                    cell: (info) => info.getValue(),
                }),
                columnHelper.accessor("nextRunAt", {
                    header: () => (
                        <SortHeader
                            label="Next run"
                            isActive={sortBy === "nextRunAt"}
                            order={sortOrder}
                            onToggle={() => onToggleSort("nextRunAt")}
                        />
                    ),
                    cell: (info) => formatDateTime(info.getValue()),
                }),
                columnHelper.display({
                    id: "lastRun",
                    header: () => (
                        <SortHeader
                            label="Last run"
                            isActive={sortBy === "lastRunAt"}
                            order={sortOrder}
                            onToggle={() => onToggleSort("lastRunAt")}
                        />
                    ),
                    cell: (info) => {
                        const item = info.row.original;

                        if (!item.lastRunAt || !item.lastRunStatus) {
                            return "-";
                        }

                        return (
                            <span>
                                {formatDateTime(item.lastRunAt)}{" "}
                                <span
                                    className={statusBadgeClassName}
                                    data-status={SCHEDULER_LAST_RUN_STATUS_TONES[item.lastRunStatus]}
                                >
                                    <ScrapeStatusLabel
                                        label={formatStatusLabel(item.lastRunStatus)}
                                        status={item.lastRunStatus}
                                    />
                                </span>
                            </span>
                        );
                    },
                }),
                columnHelper.display({
                    id: "actions",
                    header: "Actions",
                    cell: (info) => {
                        const item = info.row.original;
                        const triggerDisabledReason = getTriggerDisabledReason(item);
                        const isTriggerDisabled = triggerDisabledReason !== null || isTriggeringRun;

                        return (
                            <div className={actionRowClassName}>
                                <AppButton
                                    intent="secondary"
                                    size="small"
                                    icon={<SettingOutlined aria-hidden="true" />}
                                    aria-label={`Edit interval for ${item.categoryPathNameEt}`}
                                    title={`Edit interval for ${item.categoryPathNameEt}`}
                                    onClick={() => onEditInterval(item.categoryId)}
                                />
                                <AppButton
                                    intent="secondary"
                                    size="small"
                                    icon={<ThunderboltOutlined aria-hidden="true" />}
                                    aria-label={`Scrape now for ${item.categoryPathNameEt}`}
                                    title={triggerDisabledReason ?? undefined}
                                    disabled={isTriggerDisabled}
                                    onClick={() => void onTriggerRun(item.categoryId)}
                                />
                            </div>
                        );
                    },
                }),
            ] satisfies Array<ColumnDef<AdminSchedulerStateItemData, unknown>>,
        [
            sortBy,
            sortOrder,
            onToggleSort,
            getTriggerDisabledReason,
            isTriggeringRun,
            onEditInterval,
            onTriggerRun,
            statusBadgeClassName,
            actionRowClassName,
        ],
    );
