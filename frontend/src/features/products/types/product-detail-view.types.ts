import type { ColumnDef } from "@tanstack/react-table";
import type { RefObject } from "react";
import type { ProductHistoryControls, ProductHistoryRange } from "../history-controls";
import type { ProductDetailData, ProductHistoryData } from "../schemas";
import type { useProductDetailPageViewModel } from "../hooks/use-product-detail-page-view-model";

export interface ProductDetailViewProps {
    product: ProductDetailData["product"];
    headingRef: RefObject<HTMLHeadingElement | null>;
    controls: ProductHistoryControls;
    historyColumns: Array<ColumnDef<ProductHistoryData["items"][number], unknown>>;
    historyErrorMessage?: string;
    isHistoryLoading: boolean;
    canToggleWatch: boolean;
    isWatchPending: boolean;
    viewModel: ReturnType<typeof useProductDetailPageViewModel>;
    onToggleWatch: () => void;
    onRetryHistory: () => void;
    onResetFilters: () => void;
    onSetRange: (value: ProductHistoryRange) => void;
}
