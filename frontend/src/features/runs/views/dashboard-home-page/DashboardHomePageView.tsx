import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { CategoryTreeSelect } from "../../../categories";
import { buildCategoryTreeData, getCategoryLabelById } from "../../../categories";
import { useCategoriesQuery } from "../../../categories";
import { DashboardRunListPanel } from "../../components/dashboard/dashboard-run-list-panel";
import { DashboardSummaryGrid } from "../../components/dashboard/dashboard-summary-grid";
import dashboardStyles from "../../components/dashboard/dashboard-sections.module.scss";
import { formatDateTime, formatStatusLabel } from "../../formatters";
import { useDashboardHomeQuery } from "../../queries";
import { defaultRunsListSearch } from "../../search";
import { useSubscriptionsQuery } from "../../../settings";
import styles from "../scrape-page-view.module.scss";

export const DashboardHomePageView = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/" });
    const search = useSearch({ from: "/app/" });
    const categoriesQuery = useCategoriesQuery();
    const subscriptionsQuery = useSubscriptionsQuery();
    const dashboardQuery = useDashboardHomeQuery(search);

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
    const trackedCategories = categoriesQuery.data
        ? categoriesQuery.data.categories.filter((category) => trackedCategoryIds.has(category.id))
        : [];
    const categoryTreeData = buildCategoryTreeData(trackedCategories);
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

    const { latestRuns, recentFailures, recentChangeSummary } = dashboardQuery.data;
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
    const recentFailuresPreview = recentFailures.slice(0, 5).map((run) => ({
        id: run.id,
        categoryName: run.categoryName,
        startedAt: run.startedAt,
        statusLabel: "Failed",
        statusTone: "failed" as const,
        secondaryMeta: [formatDateTime(run.startedAt)],
        description: run.failure?.summary ?? "Run failed without a readable failure summary.",
        runId: run.id,
        actionLabel: "Inspect failed run",
    }));
    return (
        <section className={styles.page}>
            <div className={styles.stack}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Dashboard Home
                </h1>
                <p className={styles.lede}>
                    Monitor recent scrape health, current change volume, and jump directly into the most useful runs.
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
            <div className={dashboardStyles.splitColumns}>
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

                <DashboardRunListPanel
                    emptyText="No recent failed runs for your tracked categories."
                    headingId="failed-runs-heading"
                    items={recentFailuresPreview}
                    title="Recent Failures"
                />
            </div>
        </section>
    );
};
