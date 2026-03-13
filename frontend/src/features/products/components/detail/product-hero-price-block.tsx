import { Badge, Card, Space, Statistic, Tag } from "antd";
import { STOCK_STATUS_LABELS } from "../../../../shared/constants/stock.constants";
import styles from "../product-detail-view.module.scss";
import type { ProductHeroPriceBlockProps } from "../../types/product-detail-sections.types";

export const ProductHeroPriceBlock = ({ product, discountBadgeLabel }: ProductHeroPriceBlockProps) => {
    const stockStatusText = product.inStock ? STOCK_STATUS_LABELS.inStock : STOCK_STATUS_LABELS.outOfStock;

    return (
        <Card className={styles.criticalCard} size="small">
            <Space orientation="vertical" size="small" style={{ width: "100%" }}>
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
            </Space>
        </Card>
    );
};
