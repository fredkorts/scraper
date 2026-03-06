import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { STOCK_STATUS_LABELS } from "../../../shared/constants/stock.constants";
import { formatDateTime, formatPrice } from "../../../shared/formatters/display";
import { defaultRunDetailSectionSearch } from "../../../shared/navigation/default-searches";
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
                historyColumnHelper.display({
                    id: "runLink",
                    header: "Run",
                    cell: (info) => (
                        <Link
                            params={{ runId: info.row.original.scrapeRunId }}
                            search={defaultRunDetailSectionSearch}
                            to="/app/runs/$runId"
                        >
                            Open run
                        </Link>
                    ),
                }),
            ] satisfies Array<ColumnDef<ProductHistoryData["items"][number], unknown>>,
        [],
    );
