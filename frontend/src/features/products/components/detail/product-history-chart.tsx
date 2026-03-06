import { Alert, Card } from "antd";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { STOCK_STATUS_LABELS } from "../../../../shared/constants/stock.constants";
import { formatPrice } from "../../../../shared/formatters/display";
import styles from "../product-detail-view.module.scss";
import type { ProductHistoryChartProps } from "../../types/product-detail-sections.types";

const chartTickStyle = {
    fill: "var(--color-text-muted)",
    fontSize: 12,
};

export const ProductHistoryChart = ({
    chartData,
    controls,
    showOriginalPriceLine,
}: ProductHistoryChartProps) => (
    <Card size="small">
        <Alert
            className={styles.historyHint}
            title="The chart shows persisted state changes only."
            showIcon
            type="info"
        />
        <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis
                    axisLine={{ stroke: "var(--color-border)" }}
                    dataKey="label"
                    minTickGap={24}
                    tick={chartTickStyle}
                    tickLine={{ stroke: "var(--color-border)" }}
                />
                <YAxis
                    axisLine={{ stroke: "var(--color-border)" }}
                    tick={chartTickStyle}
                    tickFormatter={(value) => `EUR ${value}`}
                    tickLine={{ stroke: "var(--color-border)" }}
                    width={88}
                />
                {controls.showStockOverlay ? <YAxis domain={[0, 1]} hide yAxisId="stock" /> : null}
                <Tooltip
                    contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        borderColor: "var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--color-text)",
                    }}
                    formatter={(value, name) => {
                        if (name === "Stock state") {
                            return value === 1 ? STOCK_STATUS_LABELS.inStock : STOCK_STATUS_LABELS.outOfStock;
                        }

                        return formatPrice(typeof value === "number" ? value : undefined);
                    }}
                    itemStyle={{ color: "var(--color-text)" }}
                    labelFormatter={(_label, payload) => payload?.[0]?.payload.fullDate ?? ""}
                    labelStyle={{ color: "var(--color-text-muted)" }}
                />
                <Legend formatter={(value) => <span className={styles.chartLegendLabel}>{value}</span>} />
                <Line
                    dataKey="price"
                    dot={{ r: 3 }}
                    name="Current price"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    type="monotone"
                />
                {showOriginalPriceLine ? (
                    <Line
                        dataKey="originalPrice"
                        dot={false}
                        name="Original price"
                        stroke="var(--color-text-muted)"
                        strokeDasharray="6 4"
                        strokeWidth={2}
                        type="monotone"
                    />
                ) : null}
                {controls.showStockOverlay ? (
                    <Line
                        dataKey="stockValue"
                        dot={{ r: 2 }}
                        name="Stock state"
                        stroke="var(--color-danger)"
                        strokeDasharray="3 3"
                        strokeWidth={1.5}
                        type="stepAfter"
                        yAxisId="stock"
                    />
                ) : null}
            </LineChart>
        </ResponsiveContainer>
    </Card>
);
