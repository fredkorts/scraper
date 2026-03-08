import { Alert, Breadcrumb, Flex, Space, Tag, Typography } from "antd";
import { Link } from "@tanstack/react-router";
import { formatDateTime } from "../../../../shared/formatters/display";
import { defaultDashboardHomeSearch, defaultRunsListSearch } from "../../../../shared/navigation/default-searches";
import styles from "../product-detail-view.module.scss";
import type { ProductDetailHeaderProps } from "../../types/product-detail-sections.types";

export const ProductDetailHeader = ({ freshness, product }: ProductDetailHeaderProps) => (
    <Space orientation="vertical" size="small">
        <Breadcrumb
            items={[
                {
                    title: (
                        <Link search={defaultDashboardHomeSearch} to="/app">
                            Home
                        </Link>
                    ),
                },
                {
                    title: (
                        <Link search={defaultRunsListSearch} to="/app/runs">
                            Runs
                        </Link>
                    ),
                },
                { title: product.name },
            ]}
        />
        <div className={styles.headerStack}>
            <Typography.Title level={1}>{product.name}</Typography.Title>
            {product.isPreorder ? (
                <Tag color="gold">Preorder{product.preorderEta ? ` (ETA ${product.preorderEta})` : ""}</Tag>
            ) : null}
        </div>
        <Flex gap="small" wrap>
            <Typography.Text type="secondary">First seen: {formatDateTime(product.firstSeenAt)}</Typography.Text>
            <Typography.Text type="secondary">Last seen: {formatDateTime(product.lastSeenAt)}</Typography.Text>
            <Typography.Text type="secondary">{freshness.relativeLabel}</Typography.Text>
        </Flex>
        {freshness.isStale ? (
            <Alert
                title="Product data may be stale"
                showIcon
                type="warning"
                description="This product has not been seen in a recent scrape run. Check recent runs for refresh status."
            />
        ) : null}
    </Space>
);
