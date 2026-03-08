import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { SortHeader } from "../../../components/sort-header/SortHeader";
import { defaultProductHistoryControls } from "../../products/history-controls";
import { defaultRunDetailSectionSearch } from "../search";
import { formatChangeDetails, formatDateTime, formatStatusLabel } from "../formatters";
import type { ChangesListData } from "../schemas";
import type { UseChangesListColumnsOptions } from "../types/use-changes-list-columns.types";

const changesColumnHelper = createColumnHelper<ChangesListData["items"][number]>();

export const useChangesListColumns = ({
    sortBy,
    sortOrder,
    onToggleSort,
    productLinkClassName,
}: UseChangesListColumnsOptions) =>
    useMemo(
        () =>
            [
                changesColumnHelper.accessor("changedAt", {
                    header: () => (
                        <SortHeader
                            isActive={sortBy === "changedAt"}
                            label="Changed at"
                            order={sortOrder}
                            onToggle={() => onToggleSort("changedAt")}
                        />
                    ),
                    cell: (info) => formatDateTime(info.getValue()),
                }),
                changesColumnHelper.accessor("changeType", {
                    header: () => (
                        <SortHeader
                            isActive={sortBy === "changeType"}
                            label="Change"
                            order={sortOrder}
                            onToggle={() => onToggleSort("changeType")}
                        />
                    ),
                    cell: (info) => formatStatusLabel(info.getValue()),
                }),
                changesColumnHelper.display({
                    id: "productName",
                    header: () => (
                        <SortHeader
                            isActive={sortBy === "productName"}
                            label="Product"
                            order={sortOrder}
                            onToggle={() => onToggleSort("productName")}
                        />
                    ),
                    cell: (info) => (
                        <Link
                            params={{ productId: info.row.original.product.id }}
                            search={defaultProductHistoryControls}
                            to="/app/products/$productId"
                        >
                            {info.row.original.product.name}
                        </Link>
                    ),
                }),
                changesColumnHelper.display({
                    id: "details",
                    header: "Details",
                    cell: (info) => formatChangeDetails(info.row.original),
                }),
                changesColumnHelper.display({
                    id: "categoryName",
                    header: () => (
                        <SortHeader
                            isActive={sortBy === "categoryName"}
                            label="Category"
                            order={sortOrder}
                            onToggle={() => onToggleSort("categoryName")}
                        />
                    ),
                    cell: (info) => info.row.original.category.nameEt,
                }),
                changesColumnHelper.display({
                    id: "run",
                    header: "Run",
                    cell: (info) => (
                        <Link
                            params={{ runId: info.row.original.run.id }}
                            search={defaultRunDetailSectionSearch}
                            to="/app/runs/$runId"
                        >
                            Open run
                        </Link>
                    ),
                }),
                changesColumnHelper.display({
                    id: "externalUrl",
                    header: "Link",
                    cell: (info) => (
                        <a
                            className={productLinkClassName}
                            href={info.row.original.product.externalUrl}
                            rel="noreferrer"
                            target="_blank"
                        >
                            View product
                        </a>
                    ),
                }),
            ] satisfies Array<ColumnDef<ChangesListData["items"][number], unknown>>,
        [onToggleSort, productLinkClassName, sortBy, sortOrder],
    );
