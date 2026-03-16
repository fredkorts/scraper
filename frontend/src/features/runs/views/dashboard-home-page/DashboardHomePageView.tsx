import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryTreeSelect } from "../../../categories";
import { buildCategoryTreeData, getCategoryDisplayLabel, getCategoryLabelById } from "../../../categories";
import { useCategoriesQuery } from "../../../categories";
import { DashboardHealthStrip } from "../../components/dashboard/dashboard-health-strip";
import { DashboardRunListPanel } from "../../components/dashboard/dashboard-run-list-panel";
import { DashboardSummaryGrid } from "../../components/dashboard/dashboard-summary-grid";
import { DashboardTrackingTableSection } from "../../components/dashboard/dashboard-tracking-table-section";
import { formatDateTime, formatStatusLabel } from "../../formatters";
import { useDashboardHomeQuery } from "../../queries";
import { defaultRunsListSearch } from "../../search";
import {
    useCreateSubscriptionMutation,
    useDeleteSubscriptionMutation,
    useSubscriptionsQuery,
    useUntrackProductMutation,
} from "../../../settings";
import { NOTIFICATION_MESSAGES } from "../../../../shared/constants/notification-messages";
import { useAppNotification } from "../../../../shared/hooks/use-app-notification";
import { normalizeUserError } from "../../../../shared/utils/normalize-user-error";
import type { DashboardTrackingRow } from "../../types/dashboard-sections.types";
import styles from "../scrape-page-view.module.scss";

export const DashboardHomePageView = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/" });
    const search = useSearch({ from: "/app/" });
    const categoriesQuery = useCategoriesQuery("all");
    const subscriptionsQuery = useSubscriptionsQuery();
    const dashboardQuery = useDashboardHomeQuery(search);
    const createSubscriptionMutation = useCreateSubscriptionMutation();
    const deleteSubscriptionMutation = useDeleteSubscriptionMutation();
    const untrackProductMutation = useUntrackProductMutation();
    const { notify } = useAppNotification();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
    const [createError, setCreateError] = useState<string | null>(null);
    const [pendingRowId, setPendingRowId] = useState<string>();

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    const trackedCategoryIds = useMemo(
        () =>
            new Set(
                (subscriptionsQuery.data?.items ?? [])
                    .filter((subscription) => subscription.isActive)
                    .map((subscription) => subscription.category.id),
            ),
        [subscriptionsQuery.data],
    );

    const trackedCategories = useMemo(
        () =>
            categoriesQuery.data
                ? categoriesQuery.data.categories.filter((category) => trackedCategoryIds.has(category.id))
                : [],
        [categoriesQuery.data, trackedCategoryIds],
    );

    const categoryTreeData = useMemo(() => buildCategoryTreeData(trackedCategories), [trackedCategories]);

    const availableCategoryOptions = useMemo(
        () =>
            (categoriesQuery.data?.categories ?? [])
                .filter((category) => category.isActive && !trackedCategoryIds.has(category.id))
                .map((category) => ({
                    id: category.id,
                    label: getCategoryDisplayLabel(category),
                })),
        [categoriesQuery.data?.categories, trackedCategoryIds],
    );

    const availableCategoryIds = useMemo(
        () => new Set(availableCategoryOptions.map((option) => option.id)),
        [availableCategoryOptions],
    );

    const availableCategoryTreeData = useMemo(
        () =>
            buildCategoryTreeData(categoriesQuery.data?.categories ?? [], {
                includeCategoryIds: availableCategoryIds,
            }),
        [availableCategoryIds, categoriesQuery.data?.categories],
    );

    const categoryLabelById = useMemo(
        () => new Map(availableCategoryOptions.map((option) => [option.id, option.label])),
        [availableCategoryOptions],
    );

    const selectedTrackingCategoryId = selectedCategoryId || availableCategoryOptions[0]?.id;

    const selectedCategoryName = categoriesQuery.data
        ? getCategoryLabelById(trackedCategories, search.categoryId)
        : undefined;

    if (dashboardQuery.isError) {
        return (
            <section className={styles.page}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Dashboard Home
                </h1>
                <p className={styles.errorState} role="alert">
                    {dashboardQuery.error.message}
                </p>
            </section>
        );
    }

    if (!dashboardQuery.data) {
        return (
            <section className={styles.page}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Dashboard Home
                </h1>
                <p className={styles.emptyState}>Loading dashboard data...</p>
            </section>
        );
    }

    const { latestRuns, recentFailures, recentChangeSummary, trackingOverview } = dashboardQuery.data;

    const latestRunsPreview = latestRuns.slice(0, 5).map((run) => ({
        id: run.id,
        categoryName: run.categoryName,
        startedAt: run.startedAt,
        statusLabel: formatStatusLabel(run.status),
        statusTone: run.status,
        secondaryMeta: [formatDateTime(run.startedAt), `${run.totalChanges} changes`, `${run.totalProducts} products`],
        runId: run.id,
        actionLabel: "Open run detail",
    }));

    const handleTrackCategory = async (categoryId: string) => {
        setCreateError(null);

        try {
            await createSubscriptionMutation.mutateAsync(categoryId);
            notify({
                variant: "success",
                message: NOTIFICATION_MESSAGES.settings.categoryTracked.message,
                description: `${categoryLabelById.get(categoryId) ?? "Category"} is now tracked.`,
                key: "dashboard:tracking:create",
            });
            setSelectedCategoryId(undefined);
        } catch (error) {
            const normalizedMessage = normalizeUserError(error, "Failed to track category");
            setCreateError(normalizedMessage);
            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.settings.categoryTrackFailed.message,
                description: normalizedMessage,
                key: "dashboard:tracking:create",
            });
        }
    };

    const handleUntrack = async (row: DashboardTrackingRow) => {
        setPendingRowId(row.rowId);

        try {
            if (row.type === "category") {
                const result = await deleteSubscriptionMutation.mutateAsync(row.actionTargetId);
                const autoDisabledWatchCount = result.autoDisabledWatchCount ?? 0;

                notify({
                    variant: "success",
                    message: NOTIFICATION_MESSAGES.settings.categoryUntracked.message,
                    description:
                        autoDisabledWatchCount > 0
                            ? `Tracking removed. ${autoDisabledWatchCount} watched product${autoDisabledWatchCount === 1 ? "" : "s"} were auto-disabled.`
                            : "Tracking removed.",
                    key: "dashboard:tracking:delete",
                });
            } else {
                await untrackProductMutation.mutateAsync(row.actionTargetId);
                notify({
                    variant: "success",
                    message: NOTIFICATION_MESSAGES.settings.productUnwatched.message,
                    description: `${row.name} is no longer tracked.`,
                    key: "dashboard:tracking:product-unwatch",
                });
            }
        } catch (error) {
            notify({
                variant: "error",
                message:
                    row.type === "category"
                        ? NOTIFICATION_MESSAGES.settings.categoryUntrackFailed.message
                        : NOTIFICATION_MESSAGES.settings.productUnwatchFailed.message,
                description:
                    row.type === "category"
                        ? normalizeUserError(error, "Failed to remove tracking")
                        : normalizeUserError(error, "Failed to stop tracking product"),
                key: row.type === "category" ? "dashboard:tracking:delete" : "dashboard:tracking:product-unwatch",
            });
        } finally {
            setPendingRowId(undefined);
        }
    };

    return (
        <section className={styles.page}>
            <div className={styles.stack}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Dashboard Home
                </h1>
                <p className={styles.lede}>
                    Monitor recent scrape health, current change volume, and manage tracked categories and products in
                    one place.
                </p>
            </div>

            <div className={styles.filterRow}>
                <div className={styles.filterGroup}>
                    <label className={styles.label} htmlFor="dashboard-category-filter">
                        Category
                    </label>
                    <CategoryTreeSelect
                        allowClear
                        ariaLabel="Category"
                        className={styles.select}
                        id="dashboard-category-filter"
                        treeData={categoryTreeData}
                        placeholder="All tracked categories"
                        value={search.categoryId}
                        onChange={(value) =>
                            navigate({
                                to: ".",
                                search: {
                                    categoryId: value || undefined,
                                },
                            })
                        }
                    />
                </div>
                {selectedCategoryName ? (
                    <span className={styles.subtle}>Filtered to {selectedCategoryName}</span>
                ) : null}
            </div>

            <DashboardSummaryGrid summary={recentChangeSummary} categoryId={search.categoryId} />
            <DashboardHealthStrip categoryId={search.categoryId} failureCount={recentFailures.length} />

            <DashboardRunListPanel
                emptyText="No tracked category runs are available yet."
                headingId="latest-runs-heading"
                items={latestRunsPreview}
                title="Latest Runs"
                headerAction={
                    <Link
                        search={{
                            ...defaultRunsListSearch,
                            categoryId: search.categoryId,
                        }}
                        to="/app/runs"
                    >
                        View all runs
                    </Link>
                }
            />

            <DashboardTrackingTableSection
                categoryTreeData={availableCategoryTreeData}
                trackingRows={trackingOverview.rows}
                selectedCategoryId={selectedTrackingCategoryId}
                slotsUsed={subscriptionsQuery.data?.used ?? 0}
                slotsLimit={subscriptionsQuery.data?.limit ?? null}
                slotsRemaining={subscriptionsQuery.data?.remaining ?? null}
                lastCheckedAt={trackingOverview.lastCheckedAt}
                isCreatePending={createSubscriptionMutation.isPending}
                createError={createError}
                pendingRowId={pendingRowId}
                onCategoryChange={(value) => setSelectedCategoryId(value)}
                onTrackCategory={handleTrackCategory}
                onUntrack={handleUntrack}
            />
        </section>
    );
};
