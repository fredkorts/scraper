import { Alert, Button, Empty, Typography } from "antd";
import { ProductHistoryChart } from "./product-history-chart";
import type { ProductHistoryVisualStateProps } from "../../types/product-detail-sections.types";

export const ProductHistoryVisualState = ({
    chartData,
    controls,
    historyErrorMessage,
    isHistoryLoading,
    showOriginalPriceLine,
    onResetFilters,
    onRetryHistory,
}: ProductHistoryVisualStateProps) => {
    if (historyErrorMessage) {
        return (
            <Alert
                action={
                    <Button size="small" onClick={onRetryHistory}>
                        Retry history
                    </Button>
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
            <Empty
                description="No historical snapshots matched the current controls. Change the filters or reset them."
            >
                <Button onClick={onResetFilters}>Reset filters</Button>
            </Empty>
        );
    }

    return (
        <ProductHistoryChart
            chartData={chartData}
            controls={controls}
            showOriginalPriceLine={showOriginalPriceLine}
        />
    );
};
