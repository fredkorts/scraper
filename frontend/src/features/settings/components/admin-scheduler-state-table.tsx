import { useMemo, useState } from "react";
import { DataTable } from "../../../components/data-table/DataTable";
import { AppButton } from "../../../components/app-button/AppButton";
import { AppSelect } from "../../../components/app-select/AppSelect";
import { CategoryTreeSelect } from "../../../components/category-tree-select/CategoryTreeSelect";
import { TableSearchInput } from "../../../components/table-search-input/TableSearchInput";
import { PaginationControls } from "../../../components/pagination/PaginationControls";
import { formatDateTime } from "../../../shared/formatters/display";
import {
    normalizeTableSearchQuery,
    TABLE_SEARCH_QUERY_MAX_LENGTH,
    tokenizeTableSearchQuery,
} from "../../../shared/search/query";
import {
    DEFAULT_SCHEDULER_TABLE_PAGE_SIZE,
    SCHEDULER_ELIGIBILITY_LABELS,
    SCHEDULER_QUEUE_STATUS_LABELS,
    SCHEDULER_TABLE_PAGE_SIZE_OPTIONS,
} from "../constants/admin-scheduler-state.constants";
import { formatEligibilityStatusLabel, formatQueueStatusLabel } from "../formatters/admin-scheduler-state.formatters";
import { useAdminSchedulerColumns } from "../hooks/use-admin-scheduler-columns";
import type { AdminSchedulerSortBy, AdminSchedulerSortOrder } from "../types/admin-scheduler-sort.types";
import type { AdminSchedulerStateTableProps } from "../types/admin-scheduler-state-table.types";
import type { CategoryTreeNode } from "../../categories";
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
    const [queryInput, setQueryInput] = useState("");

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

    const categoryFilteredItems = useMemo(() => {
        if (!effectiveSelectedCategoryId) {
            return items;
        }

        const includedCategoryIds = descendantCategoryIdsByCategoryId.get(effectiveSelectedCategoryId);
        if (!includedCategoryIds) {
            return [];
        }

        return items.filter((item) => includedCategoryIds.has(item.categoryId));
    }, [descendantCategoryIdsByCategoryId, effectiveSelectedCategoryId, items]);

    const searchQuery = useMemo(() => normalizeTableSearchQuery(queryInput), [queryInput]);
    const searchTokens = useMemo(() => tokenizeTableSearchQuery(searchQuery?.toLocaleLowerCase()), [searchQuery]);

    const filteredItems = useMemo(() => {
        if (searchTokens.length === 0) {
            return categoryFilteredItems;
        }

        return categoryFilteredItems.filter((item) => {
            const searchableText = [
                item.categoryNameEt,
                item.categoryPathNameEt,
                formatEligibilityStatusLabel(item.eligibilityStatus),
                formatQueueStatusLabel(item.queueStatus),
            ]
                .join(" ")
                .toLocaleLowerCase();

            return searchTokens.every((token) => searchableText.includes(token));
        });
    }, [categoryFilteredItems, searchTokens]);

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
    const hasActiveFilters = Boolean(effectiveSelectedCategoryId || searchQuery);
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
            <div className={[styles.sectionHeader, styles.stackedSectionHeader].join(" ")}>
                <div className={styles.stack}>
                    <h2 className={styles.sectionTitle}>Category Schedule State</h2>
                    <span className={styles.subtle}>Updated {generatedAt ? formatDateTime(generatedAt) : "-"}</span>
                </div>
                <div className={styles.tableFilterRow}>
                    <div className={[styles.filterGroup, styles.tableSearchGroup].join(" ")}>
                        <label className={styles.label} htmlFor="scheduler-query-filter">
                            Search
                        </label>
                        <TableSearchInput
                            id="scheduler-query-filter"
                            ariaLabel="Search scheduler categories"
                            placeholder="Search categories and statuses"
                            value={queryInput}
                            maxLength={TABLE_SEARCH_QUERY_MAX_LENGTH}
                            onChange={(value) => {
                                setQueryInput(value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <div className={styles.tableMetaGroup}>
                        <div className={styles.filterGroup}>
                            <label className={styles.label} htmlFor="scheduler-page-size-filter">
                                Page size
                            </label>
                            <AppSelect
                                id="scheduler-page-size-filter"
                                ariaLabel="Scheduler page size"
                                className={[styles.select, styles.pageSizeSelect].join(" ")}
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
                        </div>
                        <div className={styles.filterGroup}>
                            <label className={styles.label} htmlFor="scheduler-category-filter">
                                Category
                            </label>
                            <CategoryTreeSelect
                                allowClear
                                ariaLabel="Scheduler category filter"
                                className={[styles.select, styles.schedulerFilterSelect].join(" ")}
                                disabled={!categoryTreeData.length}
                                id="scheduler-category-filter"
                                treeData={categoryTreeData}
                                placeholder="All tracked categories"
                                value={effectiveSelectedCategoryId}
                                onChange={(value) => {
                                    setSelectedCategoryId(value);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </div>
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
                    <DataTable
                        data={pagedItems}
                        columns={columns}
                        emptyText={
                            hasActiveFilters
                                ? "No scheduler categories matched the current filters."
                                : "No scheduler categories available."
                        }
                    />
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
