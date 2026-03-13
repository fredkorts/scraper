import { useMemo, useState } from "react";
import { Alert, Card, Empty, Typography } from "antd";
import { AppButton } from "../../../../components/app-button/AppButton";
import { formatDateTime, formatPrice } from "../../../../shared/formatters/display";
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
    historyVisualMode,
    isHistoryLoading,
    showOriginalPriceLine,
    onResetFilters,
    onRetryHistory,
}: ProductHistoryVisualStateProps) => {
    const [preferredView, setPreferredView] = useState<"chart" | "table">("chart");
    const activeView = historyVisualMode === "chart" ? preferredView : "table";

    const latestHistoryItem = useMemo(
        () =>
            historyItems.reduce<(typeof historyItems)[number] | null>((latest, item) => {
                if (!latest) {
                    return item;
                }

                return new Date(item.scrapedAt).getTime() > new Date(latest.scrapedAt).getTime() ? item : latest;
            }, null),
        [historyItems],
    );

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

    if (historyVisualMode === "empty") {
        return (
            <Empty description="No historical snapshots matched the current controls. Change the filters or reset them.">
                <AppButton onClick={onResetFilters}>Reset filters</AppButton>
            </Empty>
        );
    }

    if (historyVisualMode === "sparse") {
        return (
            <>
                <Typography.Paragraph className={styles.srOnly}>{historyScreenReaderSummary}</Typography.Paragraph>
                <Card className={styles.sparseHistoryCard} size="small">
                    <div className={styles.sparseHistoryContent}>
                        <Typography.Text className={styles.sparseHistoryHeadline}>
                            Not enough history to show trend yet.
                        </Typography.Text>
                        <Typography.Text className={styles.sparseHistoryMeta} type="secondary">
                            {latestHistoryItem
                                ? `Latest known price is ${formatPrice(latestHistoryItem.price)} at ${formatDateTime(latestHistoryItem.scrapedAt)}.`
                                : "Latest known price unavailable."}
                        </Typography.Text>
                    </div>
                </Card>
                <ProductHistoryTable historyColumns={historyColumns} historyItems={historyItems} />
            </>
        );
    }

    return (
        <>
            <Typography.Paragraph className={styles.srOnly}>{historyScreenReaderSummary}</Typography.Paragraph>
            <AppButton
                htmlType="button"
                intent="secondary"
                onClick={() => setPreferredView((previous) => (previous === "chart" ? "table" : "chart"))}
            >
                {activeView === "chart" ? "Table view" : "Chart view"}
            </AppButton>
            {activeView === "table" ? (
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
