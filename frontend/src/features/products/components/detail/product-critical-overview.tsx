import { Badge, Card, Col, Image, Row, Space, Statistic, Tag, Typography } from "antd";
import { STOCK_STATUS_LABELS } from "../../../../shared/constants/stock.constants";
import { formatPrice } from "../../../../shared/formatters/display";
import { PRODUCT_IMAGE_FALLBACK_DATA_URL } from "../../constants/product-detail.constants";
import styles from "../product-detail-view.module.scss";
import type { ProductCriticalOverviewProps } from "../../types/product-detail-sections.types";

export const ProductCriticalOverview = ({ discount, discountBadgeLabel, product }: ProductCriticalOverviewProps) => {
    const stockStatusText = product.inStock ? STOCK_STATUS_LABELS.inStock : STOCK_STATUS_LABELS.outOfStock;
    const originalPriceDisplay =
        typeof product.originalPrice === "number" ? product.originalPrice : product.currentPrice;

    return (
        <Row className={styles.gridRow} gutter={[16, 16]}>
            <Col className={styles.overviewImageColumn} lg={6} md={10} sm={24} xs={24}>
                <Card className={`${styles.criticalCard} ${styles.imageCard}`} size="small">
                    <Image
                        alt={product.name}
                        fallback={PRODUCT_IMAGE_FALLBACK_DATA_URL}
                        src={product.imageUrl}
                        width="100%"
                    />
                </Card>
            </Col>
            <Col className={styles.overviewInfoColumn} lg={18} md={14} sm={24} xs={24}>
                <Card className={`${styles.criticalCard} ${styles.infoCard}`} size="small">
                    <Space className={styles.infoPanelStack} orientation="vertical" size="middle">
                        <div className={styles.infoSection}>
                            <Statistic
                                className={styles.metricPrimary}
                                title="Current price"
                                value={product.currentPrice}
                                precision={2}
                                prefix="€"
                            />
                            <Badge
                                status={product.inStock ? "success" : "error"}
                                text={<Tag className={styles.stockTag}>{stockStatusText}</Tag>}
                            />
                            {discountBadgeLabel ? (
                                <Tag className={styles.discountBadge} color="green">
                                    {discountBadgeLabel}
                                </Tag>
                            ) : null}
                        </div>

                        <div className={styles.infoSection}>
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
                        </div>

                        <div className={styles.infoSection}>
                            <Typography.Text type="secondary">Categories</Typography.Text>
                            <Space size={[8, 8]} wrap>
                                {product.categories.map((category) => (
                                    <Tag key={category.id}>{category.nameEt}</Tag>
                                ))}
                            </Space>
                        </div>

                        <div className={styles.infoSection}>
                            <Typography.Text type="secondary">Price snapshots</Typography.Text>
                            <Typography.Text strong>{product.historyPointCount}</Typography.Text>
                        </div>
                    </Space>
                </Card>
            </Col>
        </Row>
    );
};
