import { Alert, Empty, Typography } from "antd";
import { AppButton } from "../../../../components/app-button/AppButton";
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
        <ProductHistoryChart chartData={chartData} controls={controls} showOriginalPriceLine={showOriginalPriceLine} />
    );
};
