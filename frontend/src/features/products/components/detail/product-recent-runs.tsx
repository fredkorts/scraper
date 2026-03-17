import { Card, Empty, Space, Tag, Typography } from "antd";
import { Link } from "@tanstack/react-router";
import { ScrapeStatusLabel } from "../../../../shared/components/scrape-status-label/ScrapeStatusLabel";
import { formatDateTime, formatDuration, formatStatusLabel } from "../../../../shared/formatters/display";
import { defaultRunDetailSectionSearch, defaultRunsListSearch } from "../../../../shared/navigation/default-searches";
import styles from "../product-detail-view.module.scss";
import type { ProductRecentRunsProps } from "../../types/product-detail-sections.types";

const toRunDurationMs = (startedAt: string, completedAt?: string): number | undefined => {
    if (!completedAt) {
        return undefined;
    }

    const startedAtMs = new Date(startedAt).getTime();
    const completedAtMs = new Date(completedAt).getTime();
    if (!Number.isFinite(startedAtMs) || !Number.isFinite(completedAtMs) || completedAtMs < startedAtMs) {
        return undefined;
    }

    return completedAtMs - startedAtMs;
};

export const ProductRecentRuns = ({ recentRuns }: ProductRecentRunsProps) => (
    <Card className={styles.sectionCard} title={<Typography.Title level={2}>Recent Runs</Typography.Title>}>
        {recentRuns.length === 0 ? (
            <Empty description="No recent runs are available for this product.">
                <Link className={styles.actionLinkButton} search={defaultRunsListSearch} to="/app/runs">
                    Back to runs
                </Link>
            </Empty>
        ) : (
            <div className={styles.recentRunsTableWrap}>
                <table className={styles.recentRunsTable}>
                    <thead>
                        <tr>
                            <th scope="col">Category</th>
                            <th scope="col">Status</th>
                            <th scope="col">Started</th>
                            <th scope="col">Completed</th>
                            <th scope="col">Duration</th>
                            <th scope="col">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentRuns.map((run) => (
                            <tr key={run.id}>
                                <td>
                                    <Typography.Text strong>{run.categoryName}</Typography.Text>
                                </td>
                                <td>
                                    <Tag>
                                        <ScrapeStatusLabel label={formatStatusLabel(run.status)} status={run.status} />
                                    </Tag>
                                </td>
                                <td>{formatDateTime(run.startedAt)}</td>
                                <td>{formatDateTime(run.completedAt)}</td>
                                <td>{formatDuration(toRunDurationMs(run.startedAt, run.completedAt))}</td>
                                <td>
                                    <Space size="small">
                                        <Link
                                            className={styles.actionLinkButton}
                                            params={{ runId: run.id }}
                                            search={defaultRunDetailSectionSearch}
                                            to="/app/runs/$runId"
                                        >
                                            Open run detail
                                        </Link>
                                    </Space>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </Card>
);
