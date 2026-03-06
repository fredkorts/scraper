import { Card, Col, Row, Statistic } from "antd";
import styles from "../product-detail-view.module.scss";
import type { ProductHistorySummaryCardsProps } from "../../types/product-detail-sections.types";

export const ProductHistorySummaryCards = ({ historySummary }: ProductHistorySummaryCardsProps) => (
    <Row className={styles.historySummaryGrid} gutter={[12, 12]}>
        <Col lg={6} md={12} sm={12} xs={24}>
            <Card size="small">
                <Statistic title="Latest filtered price" value={historySummary.latestPrice} precision={2} prefix="€" />
            </Card>
        </Col>
        <Col lg={6} md={12} sm={12} xs={24}>
            <Card size="small">
                <Statistic title="Min filtered price" value={historySummary.minPrice} precision={2} prefix="€" />
            </Card>
        </Col>
        <Col lg={6} md={12} sm={12} xs={24}>
            <Card size="small">
                <Statistic title="Max filtered price" value={historySummary.maxPrice} precision={2} prefix="€" />
            </Card>
        </Col>
        <Col lg={6} md={12} sm={12} xs={24}>
            <Card size="small">
                <Statistic title="Stock transitions" value={historySummary.stockTransitions} />
            </Card>
        </Col>
    </Row>
);
