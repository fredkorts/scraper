import { Card, Col, Image, Row, Space } from "antd";
import { PRODUCT_IMAGE_FALLBACK_DATA_URL } from "../../constants/product-detail.constants";
import { ProductHeroPriceBlock } from "./product-hero-price-block";
import { ProductSupportingDetails } from "./product-supporting-details";
import styles from "../product-detail-view.module.scss";
import type { ProductCriticalOverviewProps } from "../../types/product-detail-sections.types";

export const ProductCriticalOverview = ({ discount, discountBadgeLabel, product }: ProductCriticalOverviewProps) => (
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
            <Space className={styles.overviewStack} orientation="vertical" size="middle" style={{ width: "100%" }}>
                <ProductHeroPriceBlock discountBadgeLabel={discountBadgeLabel} product={product} />
                <ProductSupportingDetails discount={discount} product={product} />
            </Space>
        </Col>
    </Row>
);
