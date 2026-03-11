import type { ColumnDef } from "@tanstack/react-table";
import type { RefObject } from "react";
import type { ProductDetailData, ProductHistoryData } from "../schemas";
import type { useProductDetailPageViewModel } from "../hooks/use-product-detail-page-view-model";
import type { ProductHistoryControls, ProductHistoryRange, ProductHistoryStockFilter } from "../history-controls";

export type ProductDetailRecord = ProductDetailData["product"];
export type ProductHistoryRecord = ProductHistoryData["items"][number];
export type ProductDetailViewModel = ReturnType<typeof useProductDetailPageViewModel>;

export interface ProductDetailHeaderProps {
    product: ProductDetailRecord;
    freshness: ProductDetailViewModel["freshness"];
    headingRef: RefObject<HTMLHeadingElement | null>;
    canToggleWatch: boolean;
    isWatchPending: boolean;
    onToggleWatch: () => void;
}

export interface ProductCriticalOverviewProps {
    product: ProductDetailRecord;
    discount: ProductDetailViewModel["discount"];
}

export interface ProductHistoryControlsSectionProps {
    controls: ProductHistoryControls;
    availableCategoryOptions: ProductDetailViewModel["history"]["availableCategoryOptions"];
    hasOriginalPriceData: boolean;
    onResetFilters: () => void;
    onSetRange: (value: ProductHistoryRange) => void;
    onSetCategoryId: (value?: string) => void;
    onSetStockFilter: (value: ProductHistoryStockFilter) => void;
    onSetShowOriginalPrice: (checked: boolean) => void;
    onSetShowStockOverlay: (checked: boolean) => void;
}

export interface ProductHistorySummaryCardsProps {
    historySummary: ProductDetailViewModel["history"]["historySummary"];
}

export interface ProductHistoryChartProps {
    controls: ProductHistoryControls;
    chartData: ProductDetailViewModel["history"]["chartData"];
    showOriginalPriceLine: boolean;
}

export interface ProductHistoryVisualStateProps {
    controls: ProductHistoryControls;
    chartData: ProductDetailViewModel["history"]["chartData"];
    historyColumns: Array<ColumnDef<ProductHistoryRecord, unknown>>;
    historyItems: ProductHistoryRecord[];
    historyScreenReaderSummary: string;
    showOriginalPriceLine: boolean;
    historyErrorMessage?: string;
    isHistoryLoading: boolean;
    onRetryHistory: () => void;
    onResetFilters: () => void;
}

export interface ProductHistoryTableProps {
    historyColumns: Array<ColumnDef<ProductHistoryRecord, unknown>>;
    historyItems: ProductHistoryRecord[];
}

export interface ProductRecentRunsProps {
    recentRuns: ProductDetailRecord["recentRuns"];
}
