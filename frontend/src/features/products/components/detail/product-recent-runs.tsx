import { Card, Empty, Flex, Space, Tag, Typography } from "antd";
import { Link } from "@tanstack/react-router";
import { formatDateTime, formatStatusLabel } from "../../../../shared/formatters/display";
import { defaultRunDetailSectionSearch, defaultRunsListSearch } from "../../../../shared/navigation/default-searches";
import styles from "../product-detail-view.module.scss";
import type { ProductRecentRunsProps } from "../../types/product-detail-sections.types";

export const ProductRecentRuns = ({ recentRuns }: ProductRecentRunsProps) => (
    <Card className={styles.sectionCard} title={<Typography.Title level={2}>Recent Runs</Typography.Title>}>
        {recentRuns.length === 0 ? (
            <Empty description="No recent runs are available for this product.">
                <Link className={styles.actionLinkButton} search={defaultRunsListSearch} to="/app/runs">
                    Back to runs
                </Link>
            </Empty>
        ) : (
            <div className={styles.recentRunsList}>
                {recentRuns.map((run) => (
                    <Flex
                        key={run.id}
                        align="center"
                        className={styles.recentRunRow}
                        gap="small"
                        justify="space-between"
                        wrap
                    >
                        <Space orientation="vertical" size={2}>
                            <Typography.Text strong>{run.categoryName}</Typography.Text>
                            <Space className={styles.recentMeta} size="small" wrap>
                                <span>{formatDateTime(run.startedAt)}</span>
                                <Tag>{formatStatusLabel(run.status)}</Tag>
                            </Space>
                        </Space>
                        <Link
                            className={styles.actionLinkButton}
                            params={{ runId: run.id }}
                            search={defaultRunDetailSectionSearch}
                            to="/app/runs/$runId"
                        >
                            Open run detail
                        </Link>
                    </Flex>
                ))}
            </div>
        )}
    </Card>
);
