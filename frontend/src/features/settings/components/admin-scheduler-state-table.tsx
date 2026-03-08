import { useMemo, useState } from "react";
import { DataTable } from "../../../components/data-table/DataTable";
import { AppButton } from "../../../components/app-button/AppButton";
import { AppSelect } from "../../../components/app-select/AppSelect";
import { CategoryTreeSelect } from "../../../components/category-tree-select/CategoryTreeSelect";
import { PaginationControls } from "../../../components/pagination/PaginationControls";
import { formatDateTime } from "../../../shared/formatters/display";
import {
    DEFAULT_SCHEDULER_TABLE_PAGE_SIZE,
    SCHEDULER_ELIGIBILITY_LABELS,
    SCHEDULER_QUEUE_STATUS_LABELS,
    SCHEDULER_TABLE_PAGE_SIZE_OPTIONS,
} from "../constants/admin-scheduler-state.constants";
import { useAdminSchedulerColumns } from "../hooks/use-admin-scheduler-columns";
import type { AdminSchedulerSortBy, AdminSchedulerSortOrder } from "../types/admin-scheduler-sort.types";
import type { AdminSchedulerStateTableProps } from "../types/admin-scheduler-state-table.types";
import type { CategoryTreeNode } from "../../categories/types/category-tree-node";
import styles from "./settings-shared.module.scss";

export const AdminSchedulerStateTable = ({
    items,
    categoryTreeData,
    generatedAt,
    isLoading,
    error,
    isTriggeringRun,
    onRetry,
    onEditInterval,
    onTriggerRun,
    getTriggerDisabledReason,
}: AdminSchedulerStateTableProps) => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_SCHEDULER_TABLE_PAGE_SIZE);
    const [sortBy, setSortBy] = useState<AdminSchedulerSortBy>("categoryNameEt");
    const [sortOrder, setSortOrder] = useState<AdminSchedulerSortOrder>("asc");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();

    const descendantCategoryIdsByCategoryId = useMemo(() => {
        const descendantsByCategoryId = new Map<string, Set<string>>();

        const collectDescendants = (nodes: CategoryTreeNode[]): Set<string> => {
            const nodeIds = new Set<string>();

            for (const node of nodes) {
                const nestedIds = collectDescendants(node.children ?? []);
                const descendants = new Set<string>([node.value, ...nestedIds]);
                descendantsByCategoryId.set(node.value, descendants);

                for (const categoryId of descendants) {
                    nodeIds.add(categoryId);
                }
            }

            return nodeIds;
        };

        collectDescendants(categoryTreeData);

        return descendantsByCategoryId;
    }, [categoryTreeData]);
    const effectiveSelectedCategoryId =
        selectedCategoryId && descendantCategoryIdsByCategoryId.has(selectedCategoryId)
            ? selectedCategoryId
            : undefined;

    const filteredItems = useMemo(() => {
        if (!effectiveSelectedCategoryId) {
            return items;
        }

        const includedCategoryIds = descendantCategoryIdsByCategoryId.get(effectiveSelectedCategoryId);
        if (!includedCategoryIds) {
            return [];
        }

        return items.filter((item) => includedCategoryIds.has(item.categoryId));
    }, [descendantCategoryIdsByCategoryId, effectiveSelectedCategoryId, items]);

    const sortedItems = useMemo(() => {
        const normalizeDateValue = (value?: string): number => {
            if (!value) {
                return Number.POSITIVE_INFINITY;
            }

            return new Date(value).getTime();
        };
        const normalizeString = (value: string): string => value.toLocaleLowerCase();
        const direction = sortOrder === "asc" ? 1 : -1;

        return [...filteredItems].sort((a, b) => {
            const sortResult = (() => {
                if (sortBy === "categoryNameEt") {
                    return normalizeString(a.categoryNameEt).localeCompare(normalizeString(b.categoryNameEt));
                }

                if (sortBy === "scrapeIntervalHours") {
                    return a.scrapeIntervalHours - b.scrapeIntervalHours;
                }

                if (sortBy === "nextRunAt") {
                    return normalizeDateValue(a.nextRunAt) - normalizeDateValue(b.nextRunAt);
                }

                if (sortBy === "activeSubscriberCount") {
                    return a.activeSubscriberCount - b.activeSubscriberCount;
                }

                if (sortBy === "eligibilityStatus") {
                    return SCHEDULER_ELIGIBILITY_LABELS[a.eligibilityStatus].localeCompare(
                        SCHEDULER_ELIGIBILITY_LABELS[b.eligibilityStatus],
                    );
                }

                if (sortBy === "queueStatus") {
                    return SCHEDULER_QUEUE_STATUS_LABELS[a.queueStatus].localeCompare(
                        SCHEDULER_QUEUE_STATUS_LABELS[b.queueStatus],
                    );
                }

                return normalizeDateValue(a.lastRunAt) - normalizeDateValue(b.lastRunAt);
            })();

            if (sortResult !== 0) {
                return sortResult * direction;
            }

            return normalizeString(a.categoryPathNameEt).localeCompare(normalizeString(b.categoryPathNameEt));
        });
    }, [filteredItems, sortBy, sortOrder]);

    const totalItems = sortedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedItems = useMemo(() => {
        const offset = (safePage - 1) * pageSize;

        return sortedItems.slice(offset, offset + pageSize);
    }, [pageSize, safePage, sortedItems]);

    const onToggleSort = (nextSortBy: AdminSchedulerSortBy): void => {
        if (sortBy === nextSortBy) {
            setSortOrder((previous) => (previous === "asc" ? "desc" : "asc"));
            return;
        }

        setSortBy(nextSortBy);
        setSortOrder("asc");
        setPage(1);
    };

    const columns = useAdminSchedulerColumns({
        sortBy,
        sortOrder,
        onToggleSort,
        onEditInterval,
        onTriggerRun,
        getTriggerDisabledReason,
        isTriggeringRun,
        statusBadgeClassName: styles.statusBadge,
        actionRowClassName: styles.iconActionRow,
    });

    return (
        <article className={styles.card}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Category Schedule State</h2>
                <div className={styles.tableMetaGroup}>
                    <label className={styles.inlineLabel}>
                        <span className={styles.subtle}>Results per page</span>
                        <AppSelect
                            ariaLabel="Results per page"
                            className={styles.pageSizeSelect}
                            options={SCHEDULER_TABLE_PAGE_SIZE_OPTIONS}
                            value={String(pageSize)}
                            onChange={(value) => {
                                if (!value) {
                                    return;
                                }

                                setPageSize(Number(value));
                                setPage(1);
                            }}
                        />
                    </label>
                    <label className={styles.inlineLabel}>
                        <span className={styles.subtle}>Category filter</span>
                        <CategoryTreeSelect
                            allowClear
                            ariaLabel="Scheduler category filter"
                            className={styles.schedulerFilterSelect}
                            disabled={!categoryTreeData.length}
                            treeData={categoryTreeData}
                            placeholder="All scheduler categories"
                            value={effectiveSelectedCategoryId}
                            onChange={(value) => {
                                setSelectedCategoryId(value);
                                setPage(1);
                            }}
                        />
                    </label>
                    <span className={styles.subtle}>Updated {generatedAt ? formatDateTime(generatedAt) : "-"}</span>
                </div>
            </div>
            {isLoading ? <p className={styles.subtle}>Loading schedule state...</p> : null}
            {error ? (
                <div className={styles.errorPanel}>
                    <p className={styles.errorText}>Failed to load scheduler state: {error}</p>
                    <AppButton intent="secondary" onClick={onRetry}>
                        Retry
                    </AppButton>
                </div>
            ) : null}
            {!isLoading && !error ? (
                <>
                    <DataTable data={pagedItems} columns={columns} emptyText="No scheduler categories available." />
                    <PaginationControls
                        page={safePage}
                        pageSize={pageSize}
                        totalItems={totalItems}
                        totalPages={totalPages}
                        ariaLabel="Scheduler state pagination"
                        onPageChange={setPage}
                    />
                </>
            ) : null}
        </article>
    );
};
