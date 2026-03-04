import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { DataTable } from "../components/data-table/DataTable";
import { PaginationControls } from "../components/pagination/PaginationControls";
import { buildCategoryOptions } from "../features/categories/options";
import { useCategoriesQuery } from "../features/categories/queries";
import { useRunsTableColumns } from "../features/runs/hooks/use-runs-table-columns";
import { useRunsListQuery } from "../features/runs/queries";
import { useClampedPage } from "../shared/hooks/use-clamped-page";
import { useRouteSearchUpdater } from "../shared/hooks/use-route-search-updater";
import styles from "./scrape-views.module.scss";

export const RunsPage = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/runs" });
    const search = useSearch({ from: "/app/runs" });
    const categoriesQuery = useCategoriesQuery();
    const runsQuery = useRunsListQuery(search);
    const categoryOptions = categoriesQuery.data ? buildCategoryOptions(categoriesQuery.data.categories) : [];
    const setSearch = useRouteSearchUpdater(navigate);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    useClampedPage({
        currentPage: search.page,
        totalPages: runsQuery.data?.totalPages,
        onPageChange: (page, options) => setSearch({ page }, options),
    });

    const toggleSort = (sortBy: typeof search.sortBy) => {
        setSearch({
            sortBy,
            sortOrder: search.sortBy === sortBy && search.sortOrder === "desc" ? "asc" : "desc",
            page: 1,
        });
    };

    const columns = useRunsTableColumns({
        sortBy: search.sortBy,
        sortOrder: search.sortOrder,
        onToggleSort: toggleSort,
        statusBadgeClassName: styles.statusBadge,
    });

    return (
        <section className={styles.page}>
            <div className={styles.stack}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Scrape Runs
                </h1>
                <p className={styles.lede}>
                    Review past scrape executions for your tracked categories, inspect failures, and drill into the exact diff output.
                </p>
            </div>

            <div className={styles.filterRow}>
                <div className={styles.filterGroup}>
                    <label className={styles.label} htmlFor="status-filter">
                        Status
                    </label>
                    <select
                        className={styles.select}
                        id="status-filter"
                        value={search.status ?? ""}
                        onChange={(event) =>
                            setSearch({
                                status: event.target.value ? (event.target.value as typeof search.status) : undefined,
                                page: 1,
                            })
                        }
                    >
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="running">Running</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.label} htmlFor="category-filter">
                        Category
                    </label>
                    <select
                        className={styles.select}
                        id="category-filter"
                        value={search.categoryId ?? ""}
                        onChange={(event) =>
                            setSearch({
                                categoryId: event.target.value || undefined,
                                page: 1,
                            })
                        }
                    >
                        <option value="">All tracked categories</option>
                        {categoryOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.label} htmlFor="page-size">
                        Page size
                    </label>
                    <select
                        className={styles.select}
                        id="page-size"
                        value={String(search.pageSize)}
                        onChange={(event) =>
                            setSearch({
                                pageSize: Number(event.target.value),
                                page: 1,
                            })
                        }
                    >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                    </select>
                </div>
            </div>

            {runsQuery.isError ? (
                <p className={styles.errorState} role="alert">
                    {runsQuery.error.message}
                </p>
            ) : runsQuery.data ? (
                <div className={styles.section}>
                    <div className={styles.tableControls}>
                        <span className={styles.subtle}>{runsQuery.data.totalItems} total runs</span>
                    </div>

                    {runsQuery.data.items.length === 0 ? (
                        <p className={styles.emptyState}>No runs matched the current filters.</p>
                    ) : (
                        <DataTable data={runsQuery.data.items} columns={columns} />
                    )}

                    <PaginationControls
                        page={search.page}
                        pageSize={search.pageSize}
                        totalPages={runsQuery.data.totalPages}
                        totalItems={runsQuery.data.totalItems}
                        ariaLabel="Runs pagination"
                        isLoading={runsQuery.isFetching}
                        onPageChange={(nextPage) => setSearch({ page: nextPage })}
                    />
                </div>
            ) : (
                <p className={styles.emptyState}>Loading runs...</p>
            )}
        </section>
    );
};
