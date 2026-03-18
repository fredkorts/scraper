import { Card, Col, Row, Space, Statistic, Tag, Typography } from "antd";
import { formatPrice } from "../../../../shared/formatters/display";
import styles from "../product-detail-view.module.scss";
import type { ProductSupportingDetailsProps } from "../../types/product-detail-sections.types";

export const ProductSupportingDetails = ({ product, discount }: ProductSupportingDetailsProps) => {
    const originalPriceDisplay =
        typeof product.originalPrice === "number" ? product.originalPrice : product.currentPrice;

    return (
        <Row gutter={[12, 12]}>
            <Col lg={8} md={12} sm={24} xs={24}>
                <Card className={styles.criticalCard} size="small">
                    <Statistic
                        className={styles.metricSecondary}
                        title="Original price"
                        value={originalPriceDisplay}
                        precision={2}
                        prefix="€"
                    />
                    {discount.hasDiscount ? (
                        <Typography.Text type="success">
                            Save {formatPrice(discount.discountAmount)} ({discount.discountPercent}%)
                        </Typography.Text>
                    ) : null}
                </Card>
            </Col>

            <Col lg={8} md={12} sm={24} xs={24}>
                <Card className={styles.criticalCard} size="small">
                    <Statistic
                        className={styles.metricSecondary}
                        title="Price snapshots"
                        value={product.historyPointCount}
                    />
                </Card>
            </Col>

            <Col lg={8} md={24} sm={24} xs={24}>
                <Card className={styles.criticalCard} size="small" title="Categories">
                    <Space size={[8, 8]} wrap>
                        {product.categories.map((category) => (
                            <Tag key={category.id}>{category.nameEt}</Tag>
                        ))}
                    </Space>
                </Card>
            </Col>
        </Row>
    );
};
