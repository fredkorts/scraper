import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { STOCK_STATUS_LABELS } from "../../../shared/constants/stock.constants";
import { formatDateTime, formatPrice } from "../../../shared/formatters/display";
import type { ProductHistoryData } from "../schemas";

const historyColumnHelper = createColumnHelper<ProductHistoryData["items"][number]>();

export const useProductHistoryColumns = () =>
    useMemo(
        () =>
            [
                historyColumnHelper.accessor("scrapedAt", {
                    header: "Snapshot date",
                    cell: (info) => formatDateTime(info.getValue()),
                }),
                historyColumnHelper.accessor("categoryName", {
                    header: "Category",
                    cell: (info) => info.getValue(),
                }),
                historyColumnHelper.accessor("price", {
                    header: "Price",
                    cell: (info) => formatPrice(info.getValue()),
                }),
                historyColumnHelper.accessor("originalPrice", {
                    header: "Original price",
                    cell: (info) => formatPrice(info.getValue()),
                }),
                historyColumnHelper.accessor("inStock", {
                    header: "Stock",
                    cell: (info) => (info.getValue() ? STOCK_STATUS_LABELS.inStock : STOCK_STATUS_LABELS.outOfStock),
                }),
            ] satisfies Array<ColumnDef<ProductHistoryData["items"][number], unknown>>,
        [],
    );
