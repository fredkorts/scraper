import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { PriceTag } from "../../../components/price-tag/PriceTag";
import { TrackedProductBadge } from "../../../components/tracked-product-badge/TrackedProductBadge";
import { defaultProductHistoryControls } from "../../products";
import { STOCK_STATUS_LABELS } from "../../../shared/constants/stock.constants";
import {
    formatChangeDetails,
    formatPreorderState,
    formatPrice,
    formatStatusLabel,
    getChangePriceTagConfig,
} from "../formatters";
import type { RunChangesData, RunProductsData } from "../schemas";

const productColumnHelper = createColumnHelper<RunProductsData["items"][number]>();
const changeColumnHelper = createColumnHelper<RunChangesData["items"][number]>();

export const useRunDetailColumns = () => {
    const productColumns = useMemo(
        () =>
            [
                productColumnHelper.accessor("name", {
                    header: "Product",
                    cell: (info) => (
                        <span>
                            <Link
                                params={{ productId: info.row.original.productId }}
                                search={defaultProductHistoryControls}
                                to="/app/products/$productId"
                            >
                                {info.getValue()}
                            </Link>
                            {info.row.original.isWatched ? <TrackedProductBadge /> : null}
                        </span>
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
                    id: "preorder",
                    header: "Preorder",
                    cell: (info) => formatPreorderState(info.row.original),
                }),
            ] satisfies Array<ColumnDef<RunProductsData["items"][number], unknown>>,
        [],
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
                changeColumnHelper.display({
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
                changeColumnHelper.display({
                    id: "preorder",
                    header: "Preorder",
                    cell: (info) => formatPreorderState(info.row.original.product),
                }),
            ] satisfies Array<ColumnDef<RunChangesData["items"][number], unknown>>,
        [],
    );

    return {
        productColumns,
        changeColumns,
    };
};
