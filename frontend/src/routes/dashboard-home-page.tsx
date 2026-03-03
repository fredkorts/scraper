import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useCategoriesQuery } from "../features/categories/queries";
import { formatDateTime, formatStatusLabel } from "../features/runs/formatters";
import { useDashboardHomeQuery } from "../features/runs/queries";
import {
    defaultRunDetailSectionSearch,
    defaultRunsListSearch,
} from "../features/runs/search";
import styles from "./scrape-views.module.scss";

export const DashboardHomePage = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/" });
    const search = useSearch({ from: "/app/" });
    const categoriesQuery = useCategoriesQuery();
    const dashboardQuery = useDashboardHomeQuery(search);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    const selectedCategoryName =
        categoriesQuery.data?.categories.find((category) => category.id === search.categoryId)?.nameEt;

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
                    <select
                        className={styles.select}
                        id="dashboard-category-filter"
                        value={search.categoryId ?? ""}
                        onChange={(event) =>
                            navigate({
                                to: ".",
                                search: {
                                    categoryId: event.target.value || undefined,
                                },
                            })
                        }
                    >
                        <option value="">All tracked categories</option>
                        {categoriesQuery.data?.categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.nameEt}
                            </option>
                        ))}
                    </select>
                </div>
                {selectedCategoryName ? <span className={styles.subtle}>Filtered to {selectedCategoryName}</span> : null}
            </div>

            <div className={styles.summaryGrid}>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>Price decreases</span>
                    <span className={styles.metric}>{recentChangeSummary.priceDecrease}</span>
                    <span className={styles.subtle}>Last 7 days</span>
                </article>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>New products</span>
                    <span className={styles.metric}>{recentChangeSummary.newProduct}</span>
                    <span className={styles.subtle}>Last 7 days</span>
                </article>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>Sold out</span>
                    <span className={styles.metric}>{recentChangeSummary.soldOut}</span>
                    <span className={styles.subtle}>Last 7 days</span>
                </article>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>Back in stock</span>
                    <span className={styles.metric}>{recentChangeSummary.backInStock}</span>
                    <span className={styles.subtle}>Last 7 days</span>
                </article>
            </div>

            <div className={styles.splitColumns}>
                <section className={styles.section} aria-labelledby="latest-runs-heading">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle} id="latest-runs-heading">
                            Latest Runs
                        </h2>
                        <Link
                            search={{
                                ...defaultRunsListSearch,
                                categoryId: search.categoryId,
                            }}
                            to="/app/runs"
                        >
                            View all runs
                        </Link>
                    </div>
                    {latestRuns.length === 0 ? (
                        <p className={styles.emptyState}>No tracked category runs are available yet.</p>
                    ) : (
                        <div className={styles.panelList}>
                            {latestRuns.map((run) => (
                                <article className={styles.panelItem} key={run.id}>
                                    <div className={styles.sectionHeader}>
                                        <strong>{run.categoryName}</strong>
                                        <span className={styles.statusBadge} data-status={run.status}>
                                            {formatStatusLabel(run.status)}
                                        </span>
                                    </div>
                                    <div className={styles.metaRow}>
                                        <span>{formatDateTime(run.startedAt)}</span>
                                        <span>{run.totalChanges} changes</span>
                                        <span>{run.totalProducts} products</span>
                                    </div>
                                    <Link
                                        params={{ runId: run.id }}
                                        search={defaultRunDetailSectionSearch}
                                        to="/app/runs/$runId"
                                    >
                                        Open run detail
                                    </Link>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className={styles.section} aria-labelledby="failed-runs-heading">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle} id="failed-runs-heading">
                            Recent Failures
                        </h2>
                    </div>
                    {recentFailures.length === 0 ? (
                        <p className={styles.emptyState}>No recent failed runs for your tracked categories.</p>
                    ) : (
                        <div className={styles.panelList}>
                            {recentFailures.map((run) => (
                                <article className={styles.panelItem} key={run.id}>
                                    <div className={styles.sectionHeader}>
                                        <strong>{run.categoryName}</strong>
                                        <span className={styles.statusBadge} data-status="failed">
                                            Failed
                                        </span>
                                    </div>
                                    <div className={styles.metaRow}>
                                        <span>{formatDateTime(run.startedAt)}</span>
                                    </div>
                                    <p className={styles.subtle}>{run.errorMessage ?? "Run failed without an error message."}</p>
                                    <Link
                                        params={{ runId: run.id }}
                                        search={defaultRunDetailSectionSearch}
                                        to="/app/runs/$runId"
                                    >
                                        Inspect failed run
                                    </Link>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
};
