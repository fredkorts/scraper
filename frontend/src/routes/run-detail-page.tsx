import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useEffect, useRef } from "react";
import { DataTable } from "../components/data-table/DataTable";
import { defaultProductHistoryControls } from "../features/products/history-controls";
import { formatDateTime, formatDuration, formatPrice, formatStatusLabel } from "../features/runs/formatters";
import { useRunChangesQuery, useRunDetailQuery, useRunProductsQuery } from "../features/runs/queries";
import { defaultRunsListSearch } from "../features/runs/search";
import type { RunChangesData, RunProductsData } from "../features/runs/schemas";
import styles from "./scrape-views.module.scss";

const productColumnHelper = createColumnHelper<RunProductsData["items"][number]>();
const changeColumnHelper = createColumnHelper<RunChangesData["items"][number]>();

export const RunDetailPage = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/runs/$runId" });
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

    const setSearch = (updates: Partial<typeof search>) =>
        navigate({
            to: ".",
            search: (prev) => ({
                ...prev,
                ...updates,
            }),
        });

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

            {run.errorMessage ? (
                <div aria-label="Run error" className={styles.errorState} role="alert">
                    {run.errorMessage}
                </div>
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
                        <div className={styles.pagination}>
                            <button
                                type="button"
                                onClick={() => setSearch({ changesPage: Math.max(1, search.changesPage - 1) })}
                                disabled={search.changesPage <= 1}
                            >
                                Previous changes page
                            </button>
                            <span>Page {search.changesPage}</span>
                            <button
                                type="button"
                                onClick={() => setSearch({ changesPage: search.changesPage + 1 })}
                                disabled={!changesQuery.data.totalPages || search.changesPage >= changesQuery.data.totalPages}
                            >
                                Next changes page
                            </button>
                        </div>
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
                        <div className={styles.pagination}>
                            <button
                                type="button"
                                onClick={() => setSearch({ productsPage: Math.max(1, search.productsPage - 1) })}
                                disabled={search.productsPage <= 1}
                            >
                                Previous products page
                            </button>
                            <span>Page {search.productsPage}</span>
                            <button
                                type="button"
                                onClick={() => setSearch({ productsPage: search.productsPage + 1 })}
                                disabled={!productsQuery.data.totalPages || search.productsPage >= productsQuery.data.totalPages}
                            >
                                Next products page
                            </button>
                        </div>
                    </>
                ) : (
                    <p className={styles.emptyState}>Loading product snapshots...</p>
                )}
            </section>
        </section>
    );
};
