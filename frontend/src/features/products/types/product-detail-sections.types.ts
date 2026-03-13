import type { ColumnDef } from "@tanstack/react-table";
import type { RefObject } from "react";
import type { ProductDetailData, ProductHistoryData } from "../schemas";
import type { useProductDetailPageViewModel } from "../hooks/use-product-detail-page-view-model";
import type { ProductHistoryControls, ProductHistoryRange } from "../history-controls";

export type ProductDetailRecord = ProductDetailData["product"];
export type ProductHistoryRecord = ProductHistoryData["items"][number];
export type ProductDetailViewModel = ReturnType<typeof useProductDetailPageViewModel>;
export type ProductHistoryVisualMode = "empty" | "sparse" | "chart";

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
    discountBadgeLabel?: string;
}

export interface ProductHeroPriceBlockProps {
    product: ProductDetailRecord;
    discountBadgeLabel?: string;
}

export interface ProductSupportingDetailsProps {
    product: ProductDetailRecord;
    discount: ProductDetailViewModel["discount"];
}

export interface ProductHistoryControlsSectionProps {
    controls: ProductHistoryControls;
    onSetRange: (value: ProductHistoryRange) => void;
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
    historyVisualMode: ProductHistoryVisualMode;
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
