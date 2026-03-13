import { Card, Space, Typography } from "antd";
import { ProductCriticalOverview } from "./detail/product-critical-overview";
import { ProductDetailHeader } from "./detail/product-detail-header";
import { ProductHistoryControlsSection } from "./detail/product-history-controls-section";
import { ProductHistorySummaryCards } from "./detail/product-history-summary-cards";
import { ProductHistoryVisualState } from "./detail/product-history-visual-state";
import { ProductRecentRuns } from "./detail/product-recent-runs";
import styles from "./product-detail-view.module.scss";
import type { ProductDetailViewProps } from "../types/product-detail-view.types";

export const ProductDetailView = ({
    controls,
    headingRef,
    historyColumns,
    historyErrorMessage,
    isHistoryLoading,
    canToggleWatch,
    isWatchPending,
    product,
    viewModel,
    onToggleWatch,
    onResetFilters,
    onRetryHistory,
    onSetRange,
}: ProductDetailViewProps) => (
    <div className={styles.page}>
        <ProductDetailHeader
            canToggleWatch={canToggleWatch}
            freshness={viewModel.freshness}
            headingRef={headingRef}
            isWatchPending={isWatchPending}
            product={product}
            onToggleWatch={onToggleWatch}
        />

        <ProductCriticalOverview
            discount={viewModel.discount}
            discountBadgeLabel={viewModel.discountBadgeLabel}
            product={product}
        />

        <Card
            className={styles.sectionCard}
            title={
                <Typography.Title id="price-history-heading" level={2}>
                    Price History
                </Typography.Title>
            }
        >
            <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                {viewModel.historyVisualMode === "chart" ? (
                    <ProductHistoryControlsSection controls={controls} onSetRange={onSetRange} />
                ) : null}

                <ProductHistorySummaryCards historySummary={viewModel.history.historySummary} />

                <ProductHistoryVisualState
                    chartData={viewModel.history.chartData}
                    controls={controls}
                    historyColumns={historyColumns}
                    historyErrorMessage={historyErrorMessage}
                    historyItems={viewModel.history.filteredHistoryItems}
                    historyScreenReaderSummary={viewModel.historyScreenReaderSummary}
                    historyVisualMode={viewModel.historyVisualMode}
                    isHistoryLoading={isHistoryLoading}
                    showOriginalPriceLine={viewModel.history.showOriginalPriceLine}
                    onResetFilters={onResetFilters}
                    onRetryHistory={onRetryHistory}
                />
            </Space>
        </Card>

        <ProductRecentRuns recentRuns={product.recentRuns} />
    </div>
);
