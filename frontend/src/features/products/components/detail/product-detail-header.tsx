import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { Alert, Breadcrumb, Space, Tag, Typography } from "antd";
import { Link } from "@tanstack/react-router";
import { AppButton } from "../../../../components/app-button/AppButton";
import { formatDateTime } from "../../../../shared/formatters/display";
import { PREORDER_BADGE_LABEL, PREORDER_ETA_LABEL } from "../../../../shared/constants/preorder.constants";
import { defaultDashboardHomeSearch, defaultRunsListSearch } from "../../../../shared/navigation/default-searches";
import styles from "../product-detail-view.module.scss";
import type { ProductDetailHeaderProps } from "../../types/product-detail-sections.types";

export const ProductDetailHeader = ({
    canToggleWatch,
    freshness,
    headingRef,
    isWatchPending,
    product,
    onToggleWatch,
}: ProductDetailHeaderProps) => (
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
            <Typography.Title level={1} ref={headingRef} tabIndex={-1}>
                {product.name}
            </Typography.Title>
            <div className={styles.headerBadges}>
                {product.isPreorder ? (
                    <Tag color="gold">
                        {PREORDER_BADGE_LABEL}
                        {product.preorderEta ? ` (${PREORDER_ETA_LABEL} ${product.preorderEta})` : ""}
                    </Tag>
                ) : null}
                {canToggleWatch ? (
                    <AppButton
                        aria-label={product.isWatched ? "Unwatch product" : "Watch product"}
                        aria-pressed={product.isWatched}
                        data-testid="watch-product-button"
                        intent={product.isWatched ? "warning" : "primary"}
                        icon={product.isWatched ? <EyeInvisibleOutlined aria-hidden /> : <EyeOutlined aria-hidden />}
                        isLoading={isWatchPending}
                        size="middle"
                        onClick={onToggleWatch}
                    >
                        {product.isWatched ? "Watching" : "Watch product"}
                    </AppButton>
                ) : null}
                <AppButton href={product.externalUrl} intent="secondary" rel="noreferrer" target="_blank">
                    Open on Mabrik
                </AppButton>
            </div>
        </div>
        <Typography.Text type="secondary">
            Added {formatDateTime(product.firstSeenAt)} · {freshness.relativeLabel}
        </Typography.Text>
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
