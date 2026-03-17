import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { SortHeader } from "../../../components/sort-header/SortHeader";
import { ScrapeStatusLabel } from "../../../shared/components/scrape-status-label/ScrapeStatusLabel";
import { defaultRunDetailSectionSearch } from "../search";
import { formatDateTime, formatDuration } from "../formatters";
import type { RunsListData } from "../schemas";
import type { UseRunsTableColumnsOptions } from "../types/use-runs-table-columns.types";

const runsColumnHelper = createColumnHelper<RunsListData["items"][number]>();

export const useRunsTableColumns = ({
    sortBy,
    sortOrder,
    onToggleSort,
    statusBadgeClassName,
}: UseRunsTableColumnsOptions) =>
    useMemo(
        () =>
            [
                runsColumnHelper.accessor("startedAt", {
                    header: () => (
                        <SortHeader
                            isActive={sortBy === "startedAt"}
                            label="Started"
                            onToggle={() => onToggleSort("startedAt")}
                            order={sortOrder}
                        />
                    ),
                    cell: (info) => formatDateTime(info.getValue()),
                }),
                runsColumnHelper.accessor("categoryName", {
                    header: "Category",
                    cell: (info) => info.getValue(),
                }),
                runsColumnHelper.accessor("status", {
                    header: () => (
                        <SortHeader
                            isActive={sortBy === "status"}
                            label="Status"
                            onToggle={() => onToggleSort("status")}
                            order={sortOrder}
                        />
                    ),
                    cell: (info) => (
                        <span className={statusBadgeClassName} data-status={info.getValue()}>
                            <ScrapeStatusLabel status={info.getValue()} />
                        </span>
                    ),
                }),
                runsColumnHelper.accessor("totalProducts", {
                    header: () => (
                        <SortHeader
                            isActive={sortBy === "totalProducts"}
                            label="Products"
                            onToggle={() => onToggleSort("totalProducts")}
                            order={sortOrder}
                        />
                    ),
                    cell: (info) => info.getValue(),
                }),
                runsColumnHelper.accessor("totalChanges", {
                    header: () => (
                        <SortHeader
                            isActive={sortBy === "totalChanges"}
                            label="Changes"
                            onToggle={() => onToggleSort("totalChanges")}
                            order={sortOrder}
                        />
                    ),
                    cell: (info) => info.getValue(),
                }),
                runsColumnHelper.accessor("durationMs", {
                    header: () => (
                        <SortHeader
                            isActive={sortBy === "durationMs"}
                            label="Duration"
                            onToggle={() => onToggleSort("durationMs")}
                            order={sortOrder}
                        />
                    ),
                    cell: (info) => formatDuration(info.getValue()),
                }),
                runsColumnHelper.display({
                    id: "actions",
                    header: "Actions",
                    cell: (info) => {
                        const isFailedRun = info.row.original.status === "failed";
                        const run = info.row.original;
                        const runContext = `${run.categoryName}, ${formatDateTime(run.startedAt)}`;

                        return (
                            <span>
                                <Link
                                    aria-label={`Open run detail for ${runContext}`}
                                    params={{ runId: info.row.original.id }}
                                    search={defaultRunDetailSectionSearch}
                                    to="/app/runs/$runId"
                                >
                                    Open run detail
                                </Link>
                                {isFailedRun ? (
                                    <>
                                        {" · "}
                                        <Link
                                            aria-label={`View failure reason for ${runContext}`}
                                            params={{ runId: info.row.original.id }}
                                            search={defaultRunDetailSectionSearch}
                                            to="/app/runs/$runId"
                                        >
                                            View failure reason
                                        </Link>
                                    </>
                                ) : null}
                            </span>
                        );
                    },
                }),
            ] satisfies Array<ColumnDef<RunsListData["items"][number], unknown>>,
        [onToggleSort, sortBy, sortOrder, statusBadgeClassName],
    );
