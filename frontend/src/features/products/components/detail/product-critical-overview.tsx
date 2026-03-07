import { Badge, Card, Col, Descriptions, Image, Row, Space, Statistic, Tag, Typography } from "antd";
import { AppButton } from "../../../../components/app-button/AppButton";
import { formatPrice } from "../../../../shared/formatters/display";
import { PRODUCT_IMAGE_FALLBACK_DATA_URL } from "../../constants/product-detail.constants";
import { STOCK_STATUS_LABELS } from "../../../../shared/constants/stock.constants";
import styles from "../product-detail-view.module.scss";
import type { ProductCriticalOverviewProps } from "../../types/product-detail-sections.types";

export const ProductCriticalOverview = ({ discount, product }: ProductCriticalOverviewProps) => {
    const stockStatusText = product.inStock ? STOCK_STATUS_LABELS.inStock : STOCK_STATUS_LABELS.outOfStock;

    return (
        <Row className={styles.gridRow} gutter={[16, 16]}>
            <Col lg={6} md={10} sm={24} xs={24}>
                <Card className={styles.criticalCard} size="small">
                    <Image
                        alt={product.name}
                        fallback={PRODUCT_IMAGE_FALLBACK_DATA_URL}
                        src={product.imageUrl}
                        width="100%"
                    />
                </Card>
            </Col>
            <Col lg={18} md={14} sm={24} xs={24}>
                <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                    <Row gutter={[12, 12]}>
                        <Col lg={8} md={12} sm={12} xs={24}>
                            <Card className={styles.criticalCard} size="small">
                                <Statistic
                                    className={styles.metricPrimary}
                                    title="Current price"
                                    value={product.currentPrice}
                                    precision={2}
                                    prefix="€"
                                />
                            </Card>
                        </Col>
                        <Col lg={8} md={12} sm={12} xs={24}>
                            <Card className={styles.criticalCard} size="small" title="Stock">
                                <Badge
                                    status={product.inStock ? "success" : "error"}
                                    text={<Tag className={styles.stockTag}>{stockStatusText}</Tag>}
                                />
                            </Card>
                        </Col>
                        <Col lg={8} md={12} sm={12} xs={24}>
                            <Card className={styles.criticalCard} size="small">
                                <Statistic
                                    className={styles.metricSecondary}
                                    title="Original price"
                                    value={discount.hasOriginalPrice ? product.originalPrice : "—"}
                                    precision={typeof product.originalPrice === "number" ? 2 : undefined}
                                    prefix={discount.hasOriginalPrice ? "€" : undefined}
                                />
                                {discount.hasDiscount ? (
                                    <Typography.Text type="success">
                                        Save {formatPrice(discount.discountAmount)} ({discount.discountPercent}%)
                                    </Typography.Text>
                                ) : null}
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[12, 12]}>
                        <Col lg={8} md={12} sm={12} xs={24}>
                            <Card className={styles.criticalCard} size="small">
                                <Statistic
                                    className={styles.metricSecondary}
                                    title="History points"
                                    value={product.historyPointCount}
                                />
                            </Card>
                        </Col>
                        <Col lg={16} md={12} sm={12} xs={24}>
                            <Card className={styles.criticalCard} size="small" title="Categories">
                                <Space size={[8, 8]} wrap>
                                    {product.categories.map((category) => (
                                        <Tag key={category.id}>{category.nameEt}</Tag>
                                    ))}
                                </Space>
                            </Card>
                        </Col>
                    </Row>

                    <Card size="small">
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Product ID">{product.id}</Descriptions.Item>
                            <Descriptions.Item label="Source URL">{product.externalUrl}</Descriptions.Item>
                        </Descriptions>
                        <a
                            className={styles.externalLinkAnchor}
                            href={product.externalUrl}
                            rel="noreferrer"
                            target="_blank"
                        >
                            <AppButton intent="primary">Open on Mabrik</AppButton>
                        </a>
                    </Card>
                </Space>
            </Col>
        </Row>
    );
};
