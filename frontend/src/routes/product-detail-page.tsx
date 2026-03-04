import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { DataTable } from "../components/data-table/DataTable";
import { useProductHistoryColumns } from "../features/products/hooks/use-product-history-columns";
import { useProductHistoryViewModel } from "../features/products/hooks/use-product-history-view-model";
import { useProductDetailQuery, useProductHistoryQuery } from "../features/products/queries";
import { formatDateTime, formatPrice, formatStatusLabel } from "../features/runs/formatters";
import { defaultRunDetailSectionSearch, defaultRunsListSearch } from "../features/runs/search";
import { useRouteSearchUpdater } from "../shared/hooks/use-route-search-updater";
import styles from "./scrape-views.module.scss";

export const ProductDetailPage = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/products/$productId" });
    const { productId } = useParams({ from: "/app/products/$productId" });
    const search = useSearch({ from: "/app/products/$productId" });
    const detailQuery = useProductDetailQuery(productId);
    const historyQuery = useProductHistoryQuery(productId);
    const setSearch = useRouteSearchUpdater(navigate);

    useEffect(() => {
        headingRef.current?.focus();
    }, [productId]);

    const allHistoryItems = useMemo(() => historyQuery.data?.items ?? [], [historyQuery.data]);
    const {
        filteredHistoryItems,
        historySummary,
        chartData,
        availableCategoryOptions,
        hasOriginalPriceData,
        showOriginalPriceLine,
    } = useProductHistoryViewModel(allHistoryItems, search);
    const historyColumns = useProductHistoryColumns();

    if (detailQuery.isError) {
        return (
            <section className={styles.page}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Product Detail
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
                    Product Detail
                </h1>
                <p className={styles.emptyState}>Loading product detail...</p>
            </section>
        );
    }

    const { product } = detailQuery.data;

    return (
        <section className={styles.page}>
            <div className={styles.sectionHeader}>
                <div className={styles.stack}>
                    <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                        {product.name}
                    </h1>
                    <p className={styles.lede}>
                        Review the current scoped product state, recent runs, and persisted price history from your tracked
                        categories.
                    </p>
                </div>
                <Link search={defaultRunsListSearch} to="/app/runs">
                    Back to runs
                </Link>
            </div>

            <div className={styles.heroGrid}>
                <div className={styles.mediaCard}>
                    <img alt={product.name} className={styles.productImage} src={product.imageUrl} />
                </div>
                <div className={styles.stack}>
                    <div className={styles.summaryGrid}>
                        <article className={styles.card}>
                            <span className={styles.eyebrow}>Current price</span>
                            <span className={styles.metric}>{formatPrice(product.currentPrice)}</span>
                        </article>
                        <article className={styles.card}>
                            <span className={styles.eyebrow}>Original price</span>
                            <span>{formatPrice(product.originalPrice)}</span>
                        </article>
                        <article className={styles.card}>
                            <span className={styles.eyebrow}>Stock</span>
                            <span className={styles.statusBadge} data-status={product.inStock ? "completed" : "failed"}>
                                {product.inStock ? "In stock" : "Out of stock"}
                            </span>
                        </article>
                        <article className={styles.card}>
                            <span className={styles.eyebrow}>History points</span>
                            <span>{product.historyPointCount}</span>
                        </article>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.metaRow}>
                            <span>First seen: {formatDateTime(product.firstSeenAt)}</span>
                            <span>Last seen: {formatDateTime(product.lastSeenAt)}</span>
                        </div>
                        <div className={styles.tokenRow} aria-label="Product categories">
                            {product.categories.map((category) => (
                                <span className={styles.token} key={category.id}>
                                    {category.nameEt}
                                </span>
                            ))}
                        </div>
                        <a className={styles.productLink} href={product.externalUrl} rel="noreferrer" target="_blank">
                            Open on Mabrik
                        </a>
                    </div>
                </div>
            </div>

            <section aria-labelledby="price-history-heading" className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.stack}>
                        <h2 className={styles.sectionTitle} id="price-history-heading">
                            Price History
                        </h2>
                        <span className={styles.subtle}>{historySummary.pointCount} filtered state-change snapshots</span>
                    </div>
                </div>

                <div className={styles.filterToolbar}>
                    <div className={styles.filterGroup}>
                        <label className={styles.label} htmlFor="history-range">
                            Time range
                        </label>
                        <select
                            className={styles.select}
                            id="history-range"
                            value={search.range}
                            onChange={(event) =>
                                setSearch({
                                    range: event.target.value as typeof search.range,
                                })
                            }
                        >
                            <option value="30d">30 days</option>
                            <option value="90d">90 days</option>
                            <option value="180d">180 days</option>
                            <option value="all">All history</option>
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.label} htmlFor="history-category">
                            Category
                        </label>
                        <select
                            className={styles.select}
                            id="history-category"
                            value={search.categoryId ?? ""}
                            onChange={(event) =>
                                setSearch({
                                    categoryId: event.target.value || undefined,
                                })
                            }
                        >
                            <option value="">All visible categories</option>
                            {availableCategoryOptions.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.label} htmlFor="history-stock-filter">
                            Stock filter
                        </label>
                        <select
                            className={styles.select}
                            id="history-stock-filter"
                            value={search.stockFilter}
                            onChange={(event) =>
                                setSearch({
                                    stockFilter: event.target.value as typeof search.stockFilter,
                                })
                            }
                        >
                            <option value="all">All stock states</option>
                            <option value="in_stock">In stock only</option>
                            <option value="out_of_stock">Out of stock only</option>
                        </select>
                    </div>

                    <label className={styles.checkboxControl}>
                        <input
                            checked={search.showOriginalPrice}
                            disabled={!hasOriginalPriceData}
                            type="checkbox"
                            onChange={(event) =>
                                setSearch({
                                    showOriginalPrice: event.target.checked,
                                })
                            }
                        />
                        <span>Show original price</span>
                    </label>

                    <label className={styles.checkboxControl}>
                        <input
                            checked={search.showStockOverlay}
                            type="checkbox"
                            onChange={(event) =>
                                setSearch({
                                    showStockOverlay: event.target.checked,
                                })
                            }
                        />
                        <span>Show stock overlay</span>
                    </label>
                </div>

                <div className={styles.summaryGrid}>
                    <article className={styles.card}>
                        <span className={styles.eyebrow}>Latest filtered price</span>
                        <span>{formatPrice(historySummary.latestPrice)}</span>
                    </article>
                    <article className={styles.card}>
                        <span className={styles.eyebrow}>Min filtered price</span>
                        <span>{formatPrice(historySummary.minPrice)}</span>
                    </article>
                    <article className={styles.card}>
                        <span className={styles.eyebrow}>Max filtered price</span>
                        <span>{formatPrice(historySummary.maxPrice)}</span>
                    </article>
                    <article className={styles.card}>
                        <span className={styles.eyebrow}>Stock transitions</span>
                        <span>{historySummary.stockTransitions}</span>
                    </article>
                </div>

                {historyQuery.isError ? (
                    <p className={styles.errorState} role="alert">
                        {historyQuery.error.message}
                    </p>
                ) : chartData.length === 0 ? (
                    <p className={styles.emptyState}>
                        No historical snapshots matched the current controls. Change the time range, category, or stock
                        filter.
                    </p>
                ) : (
                    <div className={styles.chartCard}>
                        <p className={styles.subtle}>
                            The chart shows persisted state changes only. Flat periods without changes are intentionally not
                            repeated in the timeline.
                        </p>
                        <div className={styles.chartShell}>
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                                    <XAxis dataKey="label" minTickGap={24} />
                                    <YAxis tickFormatter={(value) => `EUR ${value}`} width={88} />
                                    {search.showStockOverlay ? <YAxis domain={[0, 1]} hide yAxisId="stock" /> : null}
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (name === "Stock state") {
                                                return value === 1 ? "In stock" : "Out of stock";
                                            }

                                            return formatPrice(typeof value === "number" ? value : undefined);
                                        }}
                                        labelFormatter={(_label, payload) => payload?.[0]?.payload.fullDate ?? ""}
                                    />
                                    <Legend />
                                    <Line
                                        dataKey="price"
                                        dot={{ r: 3 }}
                                        name="Current price"
                                        stroke="var(--color-primary)"
                                        strokeWidth={2}
                                        type="monotone"
                                    />
                                    {showOriginalPriceLine ? (
                                        <Line
                                            dataKey="originalPrice"
                                            dot={false}
                                            name="Original price"
                                            stroke="var(--color-text-muted)"
                                            strokeDasharray="6 4"
                                            strokeWidth={2}
                                            type="monotone"
                                        />
                                    ) : null}
                                    {search.showStockOverlay ? (
                                        <Line
                                            dataKey="stockValue"
                                            dot={{ r: 2 }}
                                            name="Stock state"
                                            stroke="var(--color-danger)"
                                            strokeDasharray="3 3"
                                            strokeWidth={1.5}
                                            type="stepAfter"
                                            yAxisId="stock"
                                        />
                                    ) : null}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </section>

            <section aria-labelledby="recent-runs-heading" className={styles.section}>
                <h2 className={styles.sectionTitle} id="recent-runs-heading">
                    Recent Runs
                </h2>
                {product.recentRuns.length === 0 ? (
                    <p className={styles.emptyState}>No recent runs are available for this product.</p>
                ) : (
                    <div className={styles.panelList}>
                        {product.recentRuns.map((run) => (
                            <article className={styles.panelItem} key={run.id}>
                                <div className={styles.sectionHeader}>
                                    <strong>{run.categoryName}</strong>
                                    <span className={styles.statusBadge} data-status={run.status}>
                                        {formatStatusLabel(run.status)}
                                    </span>
                                </div>
                                <div className={styles.metaRow}>
                                    <span>{formatDateTime(run.startedAt)}</span>
                                    <span>{run.completedAt ? `Completed ${formatDateTime(run.completedAt)}` : "Not completed"}</span>
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

            <section aria-labelledby="history-table-heading" className={styles.section}>
                <h2 className={styles.sectionTitle} id="history-table-heading">
                    History Table
                </h2>
                {filteredHistoryItems.length ? (
                    <DataTable columns={historyColumns} data={filteredHistoryItems} />
                ) : (
                    <p className={styles.emptyState}>History table will appear once the current filters match snapshots.</p>
                )}
            </section>
        </section>
    );
};
