import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { defaultRunDetailSectionSearch } from "../search";
import { formatDateTime, formatDuration, formatStatusLabel } from "../formatters";
import type { RunsListData } from "../schemas";

const runsColumnHelper = createColumnHelper<RunsListData["items"][number]>();

interface UseRunsTableColumnsOptions {
    sortBy: "startedAt" | "status" | "totalChanges" | "totalProducts" | "durationMs";
    sortOrder: "asc" | "desc";
    onToggleSort: (sortBy: "startedAt" | "status" | "totalChanges" | "totalProducts" | "durationMs") => void;
    statusBadgeClassName: string;
}

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
                        <button type="button" onClick={() => onToggleSort("startedAt")}>
                            Started {sortBy === "startedAt" ? `(${sortOrder})` : ""}
                        </button>
                    ),
                    cell: (info) => formatDateTime(info.getValue()),
                }),
                runsColumnHelper.accessor("categoryName", {
                    header: "Category",
                    cell: (info) => info.getValue(),
                }),
                runsColumnHelper.accessor("status", {
                    header: () => (
                        <button type="button" onClick={() => onToggleSort("status")}>
                            Status {sortBy === "status" ? `(${sortOrder})` : ""}
                        </button>
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
                        <button type="button" onClick={() => onToggleSort("totalProducts")}>
                            Products {sortBy === "totalProducts" ? `(${sortOrder})` : ""}
                        </button>
                    ),
                    cell: (info) => info.getValue(),
                }),
                runsColumnHelper.accessor("totalChanges", {
                    header: () => (
                        <button type="button" onClick={() => onToggleSort("totalChanges")}>
                            Changes {sortBy === "totalChanges" ? `(${sortOrder})` : ""}
                        </button>
                    ),
                    cell: (info) => info.getValue(),
                }),
                runsColumnHelper.accessor("durationMs", {
                    header: () => (
                        <button type="button" onClick={() => onToggleSort("durationMs")}>
                            Duration {sortBy === "durationMs" ? `(${sortOrder})` : ""}
                        </button>
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
