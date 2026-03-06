import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { defaultProductHistoryControls } from "../../products/history-controls";
import { STOCK_STATUS_LABELS } from "../../../shared/constants/stock.constants";
import { formatPrice, formatStatusLabel } from "../formatters";
import type { RunChangesData, RunProductsData } from "../schemas";
import type { UseRunDetailColumnsOptions } from "../types/use-run-detail-columns.types";

const productColumnHelper = createColumnHelper<RunProductsData["items"][number]>();
const changeColumnHelper = createColumnHelper<RunChangesData["items"][number]>();

export const useRunDetailColumns = ({ productLinkClassName }: UseRunDetailColumnsOptions) => {
    const productColumns = useMemo(
        () =>
            [
                productColumnHelper.accessor("name", {
                    header: "Product",
                    cell: (info) => (
                        <Link
                            params={{ productId: info.row.original.productId }}
                            search={defaultProductHistoryControls}
                            to="/app/products/$productId"
                        >
                            {info.getValue()}
                        </Link>
                    ),
                }),
                productColumnHelper.accessor("price", {
                    header: "Current price",
                    cell: (info) => formatPrice(info.getValue()),
                }),
                productColumnHelper.accessor("originalPrice", {
                    header: "Original price",
                    cell: (info) => formatPrice(info.getValue()),
                }),
                productColumnHelper.accessor("inStock", {
                    header: "Stock",
                    cell: (info) => (info.getValue() ? STOCK_STATUS_LABELS.inStock : STOCK_STATUS_LABELS.outOfStock),
                }),
                productColumnHelper.display({
                    id: "dashboardLink",
                    header: "Dashboard",
                    cell: (info) => (
                        <Link
                            params={{ productId: info.row.original.productId }}
                            search={defaultProductHistoryControls}
                            to="/app/products/$productId"
                        >
                            Open product
                        </Link>
                    ),
                }),
                productColumnHelper.display({
                    id: "externalUrl",
                    header: "Link",
                    cell: (info) => (
                        <a
                            className={productLinkClassName}
                            href={info.row.original.externalUrl}
                            rel="noreferrer"
                            target="_blank"
                        >
                            View product
                        </a>
                    ),
                }),
            ] satisfies Array<ColumnDef<RunProductsData["items"][number], unknown>>,
        [productLinkClassName],
    );

    const changeColumns = useMemo(
        () =>
            [
                changeColumnHelper.accessor("changeType", {
                    header: "Change",
                    cell: (info) => formatStatusLabel(info.getValue()),
                }),
                changeColumnHelper.display({
                    id: "productName",
                    header: "Product",
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
                changeColumnHelper.display({
                    id: "details",
                    header: "Details",
                    cell: (info) => {
                        const item = info.row.original;

                        if (item.oldPrice !== undefined || item.newPrice !== undefined) {
                            return `${formatPrice(item.oldPrice)} -> ${formatPrice(item.newPrice)}`;
                        }

                        if (item.oldStockStatus !== undefined || item.newStockStatus !== undefined) {
                            return `${item.oldStockStatus ? STOCK_STATUS_LABELS.inStock : STOCK_STATUS_LABELS.outOfStock} -> ${
                                item.newStockStatus ? STOCK_STATUS_LABELS.inStock : STOCK_STATUS_LABELS.outOfStock
                            }`;
                        }

                        return "State change recorded";
                    },
                }),
                changeColumnHelper.display({
                    id: "productLink",
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
            ] satisfies Array<ColumnDef<RunChangesData["items"][number], unknown>>,
        [productLinkClassName],
    );

    return {
        productColumns,
        changeColumns,
    };
};
