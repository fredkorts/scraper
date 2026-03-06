import type { ColumnDef } from "@tanstack/react-table";
import type { ProductHistoryControls, ProductHistoryRange, ProductHistoryStockFilter } from "../history-controls";
import type { ProductDetailData, ProductHistoryData } from "../schemas";
import type { useProductDetailPageViewModel } from "../hooks/use-product-detail-page-view-model";

export interface ProductDetailViewProps {
    product: ProductDetailData["product"];
    controls: ProductHistoryControls;
    historyColumns: Array<ColumnDef<ProductHistoryData["items"][number], unknown>>;
    historyErrorMessage?: string;
    isHistoryLoading: boolean;
    viewModel: ReturnType<typeof useProductDetailPageViewModel>;
    onRetryHistory: () => void;
    onResetFilters: () => void;
    onSetRange: (value: ProductHistoryRange) => void;
    onSetCategoryId: (value?: string) => void;
    onSetStockFilter: (value: ProductHistoryStockFilter) => void;
    onSetShowOriginalPrice: (checked: boolean) => void;
    onSetShowStockOverlay: (checked: boolean) => void;
}
