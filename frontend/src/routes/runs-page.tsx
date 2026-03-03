import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useEffect, useRef } from "react";
import { DataTable } from "../components/data-table/DataTable";
import { useCategoriesQuery } from "../features/categories/queries";
import { formatDateTime, formatDuration, formatStatusLabel } from "../features/runs/formatters";
import { useRunsListQuery } from "../features/runs/queries";
import { defaultRunDetailSectionSearch } from "../features/runs/search";
import type { RunsListData } from "../features/runs/schemas";
import styles from "./scrape-views.module.scss";

const columnHelper = createColumnHelper<RunsListData["items"][number]>();

export const RunsPage = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/runs" });
    const search = useSearch({ from: "/app/runs" });
    const categoriesQuery = useCategoriesQuery();
    const runsQuery = useRunsListQuery(search);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    const setSearch = (updates: Partial<typeof search>) =>
        navigate({
            to: ".",
            search: (prev) => ({
                ...prev,
                ...updates,
            }),
        });

    const toggleSort = (sortBy: typeof search.sortBy) => {
        setSearch({
            sortBy,
            sortOrder: search.sortBy === sortBy && search.sortOrder === "desc" ? "asc" : "desc",
            page: 1,
        });
    };

    const columns = [
        columnHelper.accessor("startedAt", {
            header: () => (
                <button type="button" onClick={() => toggleSort("startedAt")}>
                    Started
                </button>
            ),
            cell: (info) => formatDateTime(info.getValue()),
        }),
        columnHelper.accessor("categoryName", {
            header: "Category",
            cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("status", {
            header: () => (
                <button type="button" onClick={() => toggleSort("status")}>
                    Status
                </button>
            ),
            cell: (info) => (
                <span className={styles.statusBadge} data-status={info.getValue()}>
                    {formatStatusLabel(info.getValue())}
                </span>
            ),
        }),
        columnHelper.accessor("totalProducts", {
            header: () => (
                <button type="button" onClick={() => toggleSort("totalProducts")}>
                    Products
                </button>
            ),
            cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("totalChanges", {
            header: () => (
                <button type="button" onClick={() => toggleSort("totalChanges")}>
                    Changes
                </button>
            ),
            cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("durationMs", {
            header: () => (
                <button type="button" onClick={() => toggleSort("durationMs")}>
                    Duration
                </button>
            ),
            cell: (info) => formatDuration(info.getValue()),
        }),
        columnHelper.display({
            id: "actions",
            header: "Actions",
            cell: (info) => (
                <Link
                    params={{ runId: info.row.original.id }}
                    search={defaultRunDetailSectionSearch}
                    to="/app/runs/$runId"
                >
                    Open detail
                </Link>
            ),
        }),
    ] satisfies Array<ColumnDef<RunsListData["items"][number], unknown>>;

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
                        {categoriesQuery.data?.categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.nameEt}
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
                        <span className={styles.subtle}>
                            Showing page {runsQuery.data.page} of {Math.max(runsQuery.data.totalPages, 1)}
                        </span>
                        <span className={styles.subtle}>{runsQuery.data.totalItems} total runs</span>
                    </div>

                    {runsQuery.data.items.length === 0 ? (
                        <p className={styles.emptyState}>No runs matched the current filters.</p>
                    ) : (
                        <DataTable data={runsQuery.data.items} columns={columns} />
                    )}

                    <div className={styles.pagination}>
                        <button
                            type="button"
                            onClick={() => setSearch({ page: Math.max(1, search.page - 1) })}
                            disabled={search.page <= 1}
                        >
                            Previous page
                        </button>
                        <span>Page {search.page}</span>
                        <button
                            type="button"
                            onClick={() => setSearch({ page: search.page + 1 })}
                            disabled={!runsQuery.data.totalPages || search.page >= runsQuery.data.totalPages}
                        >
                            Next page
                        </button>
                    </div>
                </div>
            ) : (
                <p className={styles.emptyState}>Loading runs...</p>
            )}
        </section>
    );
};
