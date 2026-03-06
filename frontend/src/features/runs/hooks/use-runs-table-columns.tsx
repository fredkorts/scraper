import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { SortHeader } from "../../../components/sort-header/SortHeader";
import { defaultRunDetailSectionSearch } from "../search";
import { formatDateTime, formatDuration, formatStatusLabel } from "../formatters";
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
                            {formatStatusLabel(info.getValue())}
                        </span>
                    ),
                }),
                runsColumnHelper.display({
                    id: "failure",
                    header: "Failure",
                    cell: (info) => info.row.original.failure?.summary ?? "-",
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
                    cell: (info) => (
                        <Link
                            params={{ runId: info.row.original.id }}
                            search={defaultRunDetailSectionSearch}
                            to="/app/runs/$runId"
                        >
                            Open detail
                        </Link>
                    ),
                }),
            ] satisfies Array<ColumnDef<RunsListData["items"][number], unknown>>,
        [onToggleSort, sortBy, sortOrder, statusBadgeClassName],
    );
