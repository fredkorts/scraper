import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { PriceTag } from "../../../components/price-tag/PriceTag";
import { SortHeader } from "../../../components/sort-header/SortHeader";
import { TrackedProductBadge } from "../../../components/tracked-product-badge/TrackedProductBadge";
import { defaultProductHistoryControls } from "../../products";
import { formatChangeDetails, formatDateTime, formatPreorderState, getChangePriceTagConfig } from "../formatters";
import type { ChangesListData } from "../schemas";
import type { UseChangesListColumnsOptions } from "../types/use-changes-list-columns.types";

const changesColumnHelper = createColumnHelper<ChangesListData["items"][number]>();

export const useChangesListColumns = ({ sortBy, sortOrder, onToggleSort }: UseChangesListColumnsOptions) =>
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
                        <span>
                            <Link
                                params={{ productId: info.row.original.product.id }}
                                search={defaultProductHistoryControls}
                                to="/app/products/$productId"
                            >
                                {info.row.original.product.name}
                            </Link>
                            {info.row.original.product.isWatched ? <TrackedProductBadge /> : null}
                        </span>
                    ),
                }),
                changesColumnHelper.display({
                    id: "details",
                    header: "Details",
                    cell: (info) => {
                        const priceTagConfig = getChangePriceTagConfig(info.row.original);

                        return priceTagConfig ? (
                            <PriceTag {...priceTagConfig} />
                        ) : (
                            formatChangeDetails(info.row.original)
                        );
                    },
                }),
                changesColumnHelper.display({
                    id: "preorder",
                    header: "Preorder",
                    cell: (info) => formatPreorderState(info.row.original.product),
                }),
            ] satisfies Array<ColumnDef<ChangesListData["items"][number], unknown>>,
        [onToggleSort, sortBy, sortOrder],
    );
