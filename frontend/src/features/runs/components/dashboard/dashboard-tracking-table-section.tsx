import { PlusOutlined } from "@ant-design/icons";
import { Segmented, Input } from "antd";
import { useMemo, useState } from "react";
import { AppButton } from "../../../../components/app-button/AppButton";
import { DataTable } from "../../../../components/data-table/DataTable";
import { CategoryTreeSelect } from "../../../categories";
import { formatDateTime } from "../../../../shared/formatters/display";
import { useDashboardTrackingColumns } from "../../hooks/use-dashboard-tracking-columns";
import type { DashboardTrackingTableSectionProps } from "../../types/dashboard-sections.types";
import styles from "./dashboard-sections.module.scss";

const TRACKING_PAGE_SIZE = 25;

type TrackingFilter = "all" | "category" | "product";

export const DashboardTrackingTableSection = ({
    categoryTreeData,
    trackingRows,
    selectedCategoryId,
    slotsUsed,
    slotsLimit,
    slotsRemaining,
    lastCheckedAt,
    isCreatePending,
    createError,
    pendingRowId,
    onCategoryChange,
    onTrackCategory,
    onUntrack,
}: DashboardTrackingTableSectionProps) => {
    const [filter, setFilter] = useState<TrackingFilter>("all");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);

    const filteredRows = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();

        return trackingRows.filter((row) => {
            if (filter !== "all" && row.type !== filter) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            return row.name.toLocaleLowerCase().includes(normalizedQuery);
        });
    }, [filter, query, trackingRows]);

    const pageCount = Math.max(1, Math.ceil(filteredRows.length / TRACKING_PAGE_SIZE));
    const boundedPage = Math.min(page, pageCount);
    const pagedRows = filteredRows.slice((boundedPage - 1) * TRACKING_PAGE_SIZE, boundedPage * TRACKING_PAGE_SIZE);
    const columns = useDashboardTrackingColumns({ onUntrack, pendingRowId });
    const selectedCategoryValue = selectedCategoryId || categoryTreeData[0]?.value;
    const hasRemainingSlots = slotsRemaining === null || slotsRemaining > 0;

    return (
        <section className={`${styles.section} ${styles.fullWidthPanel}`} aria-labelledby="tracking-overview-heading">
            <div className={styles.sectionHeader}>
                <h2 className={`${styles.sectionTitle} ${styles.trackingOverviewTitle}`} id="tracking-overview-heading">
                    Tracking Overview
                </h2>
                <span className={styles.subtle}>
                    Last checked: {lastCheckedAt ? formatDateTime(lastCheckedAt) : "No runs yet"}
                </span>
            </div>

            <div className={styles.sectionBody}>
                <div className={styles.trackingControls}>
                    <div className={styles.trackingCreateRow}>
                        <CategoryTreeSelect
                            ariaLabel="Track a category"
                            className={styles.trackingSelect}
                            treeData={categoryTreeData}
                            value={selectedCategoryValue}
                            onChange={(value) => onCategoryChange(value ?? undefined)}
                        />
                        <AppButton
                            icon={<PlusOutlined aria-hidden />}
                            intent="success"
                            size="large"
                            disabled={!selectedCategoryValue || !hasRemainingSlots}
                            isLoading={isCreatePending}
                            onClick={() =>
                                void (selectedCategoryValue ? onTrackCategory(selectedCategoryValue) : undefined)
                            }
                        >
                            Track category
                        </AppButton>
                    </div>
                    <div className={styles.metaRow}>
                        <span>
                            Slots used: {slotsUsed}
                            {slotsLimit === null ? " / Unlimited" : ` / ${slotsLimit}`}
                        </span>
                        <span>Remaining: {slotsRemaining === null ? "Unlimited" : slotsRemaining}</span>
                    </div>
                    {!hasRemainingSlots ? (
                        <p className={styles.subtle}>No tracking slots remaining on your current plan.</p>
                    ) : null}
                    {createError ? <p className={styles.errorText}>{createError}</p> : null}
                </div>

                <div className={styles.trackingFilters}>
                    <Segmented<TrackingFilter>
                        options={[
                            { label: "All", value: "all" },
                            { label: "Categories", value: "category" },
                            { label: "Products", value: "product" },
                        ]}
                        value={filter}
                        onChange={(value) => {
                            setFilter(value);
                            setPage(1);
                        }}
                    />
                    <Input
                        allowClear
                        className={styles.trackingSearch}
                        placeholder="Search tracked names"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={pagedRows}
                    emptyText="No tracked items match your current filters."
                />

                {pageCount > 1 ? (
                    <div className={styles.paginationRow}>
                        <AppButton
                            intent="secondary"
                            disabled={boundedPage <= 1}
                            onClick={() => setPage(boundedPage - 1)}
                        >
                            Previous
                        </AppButton>
                        <span className={styles.subtle}>
                            Page {boundedPage} of {pageCount}
                        </span>
                        <AppButton
                            intent="secondary"
                            disabled={boundedPage >= pageCount}
                            onClick={() => setPage(boundedPage + 1)}
                        >
                            Next
                        </AppButton>
                    </div>
                ) : null}
            </div>
        </section>
    );
};
