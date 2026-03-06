import { Card, Space, Typography } from "antd";
import { ProductCriticalOverview } from "./detail/product-critical-overview";
import { ProductDetailHeader } from "./detail/product-detail-header";
import { ProductHistoryControlsSection } from "./detail/product-history-controls-section";
import { ProductHistorySummaryCards } from "./detail/product-history-summary-cards";
import { ProductHistoryTable } from "./detail/product-history-table";
import { ProductHistoryVisualState } from "./detail/product-history-visual-state";
import { ProductRecentRuns } from "./detail/product-recent-runs";
import styles from "./product-detail-view.module.scss";
import type { ProductDetailViewProps } from "../types/product-detail-view.types";

export const ProductDetailView = ({
    controls,
    historyColumns,
    historyErrorMessage,
    isHistoryLoading,
    product,
    viewModel,
    onResetFilters,
    onRetryHistory,
    onSetCategoryId,
    onSetRange,
    onSetShowOriginalPrice,
    onSetShowStockOverlay,
    onSetStockFilter,
}: ProductDetailViewProps) => (
    <div className={styles.page}>
        <ProductDetailHeader freshness={viewModel.freshness} product={product} />

        <ProductCriticalOverview discount={viewModel.discount} product={product} />

        <Card
            className={styles.sectionCard}
            title={(
                <Typography.Title id="price-history-heading" level={2}>
                    Price History
                </Typography.Title>
            )}
        >
            <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                <Typography.Text id="price-history-summary" type="secondary">
                    {viewModel.history.historySummary.pointCount} filtered state-change snapshots
                </Typography.Text>
                <span className={styles.srOnly}>{viewModel.historyScreenReaderSummary}</span>

                <ProductHistoryControlsSection
                    availableCategoryOptions={viewModel.history.availableCategoryOptions}
                    controls={controls}
                    hasOriginalPriceData={viewModel.history.hasOriginalPriceData}
                    onResetFilters={onResetFilters}
                    onSetCategoryId={onSetCategoryId}
                    onSetRange={onSetRange}
                    onSetShowOriginalPrice={onSetShowOriginalPrice}
                    onSetShowStockOverlay={onSetShowStockOverlay}
                    onSetStockFilter={onSetStockFilter}
                />

                <ProductHistorySummaryCards historySummary={viewModel.history.historySummary} />

                <ProductHistoryVisualState
                    chartData={viewModel.history.chartData}
                    controls={controls}
                    historyErrorMessage={historyErrorMessage}
                    isHistoryLoading={isHistoryLoading}
                    showOriginalPriceLine={viewModel.history.showOriginalPriceLine}
                    onResetFilters={onResetFilters}
                    onRetryHistory={onRetryHistory}
                />

                <ProductHistoryTable
                    historyColumns={historyColumns}
                    historyItems={viewModel.history.filteredHistoryItems}
                />
            </Space>
        </Card>

        <ProductRecentRuns recentRuns={product.recentRuns} />
    </div>
);
