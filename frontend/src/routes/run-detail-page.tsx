import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useRef } from "react";
import { DataTable } from "../components/data-table/DataTable";
import { PaginationControls } from "../components/pagination/PaginationControls";
import { useMeQuery } from "../features/auth/queries";
import { defaultProductHistoryControls } from "../features/products/history-controls";
import {
    formatDateTime,
    formatDuration,
    formatFailurePhaseLabel,
    formatPrice,
    formatRetryableLabel,
    formatStatusLabel,
} from "../features/runs/formatters";
import { useRunChangesQuery, useRunDetailQuery, useRunProductsQuery } from "../features/runs/queries";
import { defaultRunsListSearch } from "../features/runs/search";
import type { RunChangesData, RunProductsData } from "../features/runs/schemas";
import styles from "./scrape-views.module.scss";

const productColumnHelper = createColumnHelper<RunProductsData["items"][number]>();
const changeColumnHelper = createColumnHelper<RunChangesData["items"][number]>();

export const RunDetailPage = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/runs/$runId" });
    const session = useMeQuery();
    const { runId } = useParams({ from: "/app/runs/$runId" });
    const search = useSearch({ from: "/app/runs/$runId" });
    const detailQuery = useRunDetailQuery(runId);
    const productsQuery = useRunProductsQuery(runId, {
        page: search.productsPage,
        pageSize: search.productsPageSize,
        inStock: search.productsInStock,
    });
    const changesQuery = useRunChangesQuery(runId, {
        page: search.changesPage,
        pageSize: search.changesPageSize,
        changeType: search.changeType,
    });

    useEffect(() => {
        headingRef.current?.focus();
    }, [runId]);

    const setSearch = useCallback(
        (updates: Partial<typeof search>, options?: { replace?: boolean }) =>
            navigate({
                to: ".",
                replace: options?.replace,
                search: (prev) => ({
                    ...prev,
                    ...updates,
                }),
            }),
        [navigate],
    );

    useEffect(() => {
        if (!changesQuery.data) {
            return;
        }

        const { totalPages } = changesQuery.data;

        if (totalPages === 0 && search.changesPage !== 1) {
            setSearch({ changesPage: 1 }, { replace: true });
            return;
        }

        if (totalPages > 0 && search.changesPage > totalPages) {
            setSearch({ changesPage: totalPages }, { replace: true });
        }
    }, [changesQuery.data, search.changesPage, setSearch]);

    useEffect(() => {
        if (!productsQuery.data) {
            return;
        }

        const { totalPages } = productsQuery.data;

        if (totalPages === 0 && search.productsPage !== 1) {
            setSearch({ productsPage: 1 }, { replace: true });
            return;
        }

        if (totalPages > 0 && search.productsPage > totalPages) {
            setSearch({ productsPage: totalPages }, { replace: true });
        }
    }, [productsQuery.data, search.productsPage, setSearch]);

    const productColumns = [
        productColumnHelper.accessor("name", {
            header: "Product",
            cell: (info) => (
                <Link
                    params={{ productId: info.row.original.productId }}
                    search={defaultProductHistoryControls}
                    to="/app/products/$productId"
                >
                    {info.getValue()}
                </Link>
            ),
        }),
        productColumnHelper.accessor("price", {
            header: "Current price",
            cell: (info) => formatPrice(info.getValue()),
        }),
        productColumnHelper.accessor("originalPrice", {
            header: "Original price",
            cell: (info) => formatPrice(info.getValue()),
        }),
        productColumnHelper.accessor("inStock", {
            header: "Stock",
            cell: (info) => (info.getValue() ? "In stock" : "Out of stock"),
        }),
        productColumnHelper.display({
            id: "dashboardLink",
            header: "Dashboard",
            cell: (info) => (
                <Link
                    params={{ productId: info.row.original.productId }}
                    search={defaultProductHistoryControls}
                    to="/app/products/$productId"
                >
                    Open product
                </Link>
            ),
        }),
        productColumnHelper.display({
            id: "externalUrl",
            header: "Link",
            cell: (info) => (
                <a className={styles.productLink} href={info.row.original.externalUrl} rel="noreferrer" target="_blank">
                    View product
                </a>
            ),
        }),
    ] satisfies Array<ColumnDef<RunProductsData["items"][number], unknown>>;

    const changeColumns = [
        changeColumnHelper.accessor("changeType", {
            header: "Change",
            cell: (info) => formatStatusLabel(info.getValue()),
        }),
        changeColumnHelper.display({
            id: "productName",
            header: "Product",
            cell: (info) => (
                <Link
                    params={{ productId: info.row.original.product.id }}
                    search={defaultProductHistoryControls}
                    to="/app/products/$productId"
                >
                    {info.row.original.product.name}
                </Link>
            ),
        }),
        changeColumnHelper.display({
            id: "details",
            header: "Details",
            cell: (info) => {
                const item = info.row.original;

                if (item.oldPrice !== undefined || item.newPrice !== undefined) {
                    return `${formatPrice(item.oldPrice)} -> ${formatPrice(item.newPrice)}`;
                }

                if (item.oldStockStatus !== undefined || item.newStockStatus !== undefined) {
                    return `${item.oldStockStatus ? "In stock" : "Out of stock"} -> ${
                        item.newStockStatus ? "In stock" : "Out of stock"
                    }`;
                }

                return "State change recorded";
            },
        }),
        changeColumnHelper.display({
            id: "productLink",
            header: "Link",
            cell: (info) => (
                <a className={styles.productLink} href={info.row.original.product.externalUrl} rel="noreferrer" target="_blank">
                    View product
                </a>
            ),
        }),
    ] satisfies Array<ColumnDef<RunChangesData["items"][number], unknown>>;

    if (detailQuery.isError) {
        return (
            <section className={styles.page}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Run Detail
                </h1>
                <p className={styles.errorState} role="alert">
                    {detailQuery.error.message}
                </p>
            </section>
        );
    }

    if (!detailQuery.data) {
        return (
            <section className={styles.page}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Run Detail
                </h1>
                <p className={styles.emptyState}>Loading run detail...</p>
            </section>
        );
    }

    const { run } = detailQuery.data;
    const isAdmin = session.data?.role === "admin";

    return (
        <section className={styles.page}>
            <div className={styles.stack}>
                <div className={styles.sectionHeader}>
                    <div className={styles.stack}>
                        <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                            {run.categoryName}
                        </h1>
                        <p className={styles.lede}>
                            Inspect one scrape run, its diff output, and the exact snapshot data persisted for that execution.
                        </p>
                    </div>
                    <Link search={defaultRunsListSearch} to="/app/runs">
                        Back to runs
                    </Link>
                </div>
                <span className={styles.statusBadge} data-status={run.status}>
                    {formatStatusLabel(run.status)}
                </span>
            </div>

            <div className={styles.summaryGrid}>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>Started</span>
                    <span>{formatDateTime(run.startedAt)}</span>
                </article>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>Completed</span>
                    <span>{formatDateTime(run.completedAt)}</span>
                </article>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>Duration</span>
                    <span>{formatDuration(run.durationMs)}</span>
                </article>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>Changes</span>
                    <span>{run.totalChanges}</span>
                </article>
            </div>

            {run.failure ? (
                <section aria-labelledby="failure-heading" className={styles.failurePanel}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle} id="failure-heading">
                            Failure Detail
                        </h2>
                        <span className={styles.statusBadge} data-status="failed">
                            Failed
                        </span>
                    </div>
                    <div className={styles.errorState} role="alert">
                        {run.failure.summary}
                    </div>
                    <dl className={styles.failureMeta}>
                        <div>
                            <dt className={styles.eyebrow}>Phase</dt>
                            <dd>{formatFailurePhaseLabel(run.failure.phase)}</dd>
                        </div>
                        <div>
                            <dt className={styles.eyebrow}>Page</dt>
                            <dd>{run.failure.pageNumber ?? "-"}</dd>
                        </div>
                        <div>
                            <dt className={styles.eyebrow}>Retryable</dt>
                            <dd>{formatRetryableLabel(run.failure.isRetryable)}</dd>
                        </div>
                        <div>
                            <dt className={styles.eyebrow}>URL</dt>
                            <dd>
                                {run.failure.pageUrl ? (
                                    <a
                                        className={styles.productLink}
                                        href={run.failure.pageUrl}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        {run.failure.pageUrl}
                                    </a>
                                ) : (
                                    "-"
                                )}
                            </dd>
                        </div>
                    </dl>
                    {isAdmin && run.failure.technicalMessage ? (
                        <div className={styles.technicalPanel}>
                            <span className={styles.eyebrow}>Technical details</span>
                            <code>{run.failure.technicalMessage}</code>
                        </div>
                    ) : null}
                </section>
            ) : null}

            <div className={styles.summaryGrid}>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>Total products</span>
                    <span>{run.totalProducts}</span>
                </article>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>New products</span>
                    <span>{run.newProducts}</span>
                </article>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>Price changes</span>
                    <span>{run.priceChanges}</span>
                </article>
                <article className={styles.card}>
                    <span className={styles.eyebrow}>Sold out / Back in stock</span>
                    <span>
                        {run.soldOut} / {run.backInStock}
                    </span>
                </article>
            </div>

            <section aria-labelledby="changes-heading" className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle} id="changes-heading">
                        Diff Items
                    </h2>
                    <div className={styles.filterGroup}>
                        <label className={styles.label} htmlFor="change-type-filter">
                            Change type
                        </label>
                        <select
                            className={styles.select}
                            id="change-type-filter"
                            value={search.changeType ?? ""}
                            onChange={(event) =>
                                setSearch({
                                    changeType: event.target.value ? (event.target.value as typeof search.changeType) : undefined,
                                    changesPage: 1,
                                })
                            }
                        >
                            <option value="">All change types</option>
                            <option value="price_decrease">Price decrease</option>
                            <option value="price_increase">Price increase</option>
                            <option value="new_product">New product</option>
                            <option value="sold_out">Sold out</option>
                            <option value="back_in_stock">Back in stock</option>
                        </select>
                    </div>
                </div>

                {changesQuery.isError ? (
                    <p className={styles.errorState} role="alert">
                        {changesQuery.error.message}
                    </p>
                ) : changesQuery.data ? (
                    <>
                        {changesQuery.data.items.length === 0 ? (
                            <p className={styles.emptyState}>No diff items matched the current filter.</p>
                        ) : (
                            <DataTable columns={changeColumns} data={changesQuery.data.items} />
                        )}
                        <PaginationControls
                            page={search.changesPage}
                            pageSize={search.changesPageSize}
                            totalPages={changesQuery.data.totalPages}
                            totalItems={changesQuery.data.totalItems}
                            ariaLabel="Run changes pagination"
                            isLoading={changesQuery.isFetching}
                            onPageChange={(nextPage) => setSearch({ changesPage: nextPage })}
                        />
                    </>
                ) : (
                    <p className={styles.emptyState}>Loading diff items...</p>
                )}
            </section>

            <section aria-labelledby="products-heading" className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle} id="products-heading">
                        Product Snapshots
                    </h2>
                    <div className={styles.filterGroup}>
                        <label className={styles.label} htmlFor="stock-filter">
                            Stock filter
                        </label>
                        <select
                            className={styles.select}
                            id="stock-filter"
                            value={search.productsInStock ?? ""}
                            onChange={(event) =>
                                setSearch({
                                    productsInStock: event.target.value
                                        ? (event.target.value as typeof search.productsInStock)
                                        : undefined,
                                    productsPage: 1,
                                })
                            }
                        >
                            <option value="">All stock states</option>
                            <option value="true">In stock</option>
                            <option value="false">Out of stock</option>
                        </select>
                    </div>
                </div>

                {productsQuery.isError ? (
                    <p className={styles.errorState} role="alert">
                        {productsQuery.error.message}
                    </p>
                ) : productsQuery.data ? (
                    <>
                        {productsQuery.data.items.length === 0 ? (
                            <p className={styles.emptyState}>No product snapshots matched the current filter.</p>
                        ) : (
                            <DataTable columns={productColumns} data={productsQuery.data.items} />
                        )}
                        <PaginationControls
                            page={search.productsPage}
                            pageSize={search.productsPageSize}
                            totalPages={productsQuery.data.totalPages}
                            totalItems={productsQuery.data.totalItems}
                            ariaLabel="Run products pagination"
                            isLoading={productsQuery.isFetching}
                            onPageChange={(nextPage) => setSearch({ productsPage: nextPage })}
                        />
                    </>
                ) : (
                    <p className={styles.emptyState}>Loading product snapshots...</p>
                )}
            </section>
        </section>
    );
};
