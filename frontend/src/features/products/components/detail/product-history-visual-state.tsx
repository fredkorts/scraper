import { useState } from "react";
import { Alert, Empty, Typography } from "antd";
import { AppButton } from "../../../../components/app-button/AppButton";
import { ProductHistoryTable } from "./product-history-table";
import { ProductHistoryChart } from "./product-history-chart";
import type { ProductHistoryVisualStateProps } from "../../types/product-detail-sections.types";
import styles from "../product-detail-view.module.scss";

export const ProductHistoryVisualState = ({
    chartData,
    controls,
    historyColumns,
    historyErrorMessage,
    historyItems,
    historyScreenReaderSummary,
    isHistoryLoading,
    showOriginalPriceLine,
    onResetFilters,
    onRetryHistory,
}: ProductHistoryVisualStateProps) => {
    const [showTableFallback, setShowTableFallback] = useState(false);

    if (historyErrorMessage) {
        return (
            <Alert
                action={
                    <AppButton size="small" onClick={onRetryHistory}>
                        Retry history
                    </AppButton>
                }
                description={historyErrorMessage}
                title="Failed to load history"
                showIcon
                type="error"
            />
        );
    }

    if (isHistoryLoading) {
        return <Typography.Text>Loading history...</Typography.Text>;
    }

    if (chartData.length === 0) {
        return (
            <Empty description="No historical snapshots matched the current controls. Change the filters or reset them.">
                <AppButton onClick={onResetFilters}>Reset filters</AppButton>
            </Empty>
        );
    }

    return (
        <>
            <Typography.Paragraph className={styles.chartSummaryText}>
                {historyScreenReaderSummary}
            </Typography.Paragraph>
            <AppButton
                htmlType="button"
                intent="secondary"
                onClick={() => setShowTableFallback((previous) => !previous)}
            >
                {showTableFallback ? "Show chart view" : "Show table fallback"}
            </AppButton>
            {showTableFallback ? (
                <ProductHistoryTable historyColumns={historyColumns} historyItems={historyItems} />
            ) : (
                <ProductHistoryChart
                    chartData={chartData}
                    controls={controls}
                    showOriginalPriceLine={showOriginalPriceLine}
                />
            )}
        </>
    );
};
