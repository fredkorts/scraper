import { Card, Col, Row, Statistic, Typography } from "antd";
import styles from "../product-detail-view.module.scss";
import type { ProductHistorySummaryCardsProps } from "../../types/product-detail-sections.types";

export const ProductHistorySummaryCards = ({ historySummary }: ProductHistorySummaryCardsProps) => {
    const volatilityRange =
        typeof historySummary.minPrice === "number" && typeof historySummary.maxPrice === "number"
            ? historySummary.maxPrice - historySummary.minPrice
            : undefined;

    return (
        <Row className={styles.historySummaryGrid} gutter={[12, 12]}>
            <Col lg={8} md={12} sm={12} xs={24}>
                <Card size="small">
                    <Statistic
                        title="Latest filtered price"
                        value={historySummary.latestPrice}
                        precision={2}
                        prefix="€"
                    />
                </Card>
            </Col>
            <Col lg={8} md={12} sm={12} xs={24}>
                <Card size="small">
                    <Statistic title="Min filtered price" value={historySummary.minPrice} precision={2} prefix="€" />
                </Card>
            </Col>
            <Col lg={8} md={12} sm={12} xs={24}>
                <Card size="small">
                    <Statistic title="Max filtered price" value={historySummary.maxPrice} precision={2} prefix="€" />
                </Card>
            </Col>
            <Col lg={8} md={12} sm={12} xs={24}>
                <Card size="small">
                    <Statistic title="Volatility range" value={volatilityRange} precision={2} prefix="€" />
                </Card>
            </Col>
            <Col lg={8} md={12} sm={12} xs={24}>
                <Card size="small">
                    <Statistic title="Stock transitions" value={historySummary.stockTransitions} />
                </Card>
            </Col>
            <Col lg={8} md={12} sm={12} xs={24}>
                <Card size="small">
                    <Statistic title="Filtered snapshots" value={historySummary.pointCount} />
                    <Typography.Text className={styles.chartSummaryText} type="secondary">
                        Based on current filters
                    </Typography.Text>
                </Card>
            </Col>
        </Row>
    );
};
