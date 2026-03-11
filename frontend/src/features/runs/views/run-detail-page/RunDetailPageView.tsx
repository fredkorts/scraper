import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMeQuery } from "../../../auth";
import { RunChangesSection } from "../../components/detail/run-changes-section";
import { RunFailurePanel } from "../../components/detail/run-failure-panel";
import { RunMetricsGrid } from "../../components/detail/run-metrics-grid";
import { RunProductsSection } from "../../components/detail/run-products-section";
import sectionStyles from "../../components/detail/run-detail-sections.module.scss";
import { formatDateTime, formatDuration, formatStatusLabel } from "../../formatters";
import { useRunDetailColumns } from "../../hooks/use-run-detail-columns";
import { useRunChangesQuery, useRunDetailQuery, useRunProductsQuery } from "../../queries";
import { defaultRunsListSearch, normalizeTableSearchQuery } from "../../search";
import { useDebouncedValue } from "../../../../shared/hooks/use-debounced-value";
import { useClampedPage } from "../../../../shared/hooks/use-clamped-page";
import { useRouteSearchUpdater } from "../../../../shared/hooks/use-route-search-updater";
import styles from "../scrape-page-view.module.scss";

export const RunDetailPageView = () => {
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
        query: search.productsQuery,
    });
    const changesQuery = useRunChangesQuery(runId, {
        page: search.changesPage,
        pageSize: search.changesPageSize,
        changeType: search.changeType,
        preorder: search.preorder,
        query: search.changesQuery,
    });
    const setSearch = useRouteSearchUpdater(navigate);
    const [changesQueryInput, setChangesQueryInput] = useState(search.changesQuery ?? "");
    const [productsQueryInput, setProductsQueryInput] = useState(search.productsQuery ?? "");
    const debouncedChangesQueryInput = useDebouncedValue(changesQueryInput, 350);
    const debouncedProductsQueryInput = useDebouncedValue(productsQueryInput, 350);

    useEffect(() => {
        headingRef.current?.focus();
    }, [runId]);

    useEffect(() => {
        // URL search is the source of truth, so this sync keeps local input state aligned for back/forward navigation.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setChangesQueryInput(search.changesQuery ?? "");
    }, [search.changesQuery]);

    useEffect(() => {
        // URL search is the source of truth, so this sync keeps local input state aligned for back/forward navigation.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProductsQueryInput(search.productsQuery ?? "");
    }, [search.productsQuery]);

    useEffect(() => {
        const normalizedQuery = normalizeTableSearchQuery(debouncedChangesQueryInput);

        if (normalizedQuery === search.changesQuery) {
            return;
        }

        setSearch(
            {
                changesQuery: normalizedQuery,
                changesPage: 1,
            },
            { replace: true },
        );
    }, [debouncedChangesQueryInput, search.changesQuery, setSearch]);

    useEffect(() => {
        const normalizedQuery = normalizeTableSearchQuery(debouncedProductsQueryInput);

        if (normalizedQuery === search.productsQuery) {
            return;
        }

        setSearch(
            {
                productsQuery: normalizedQuery,
                productsPage: 1,
            },
            { replace: true },
        );
    }, [debouncedProductsQueryInput, search.productsQuery, setSearch]);

    useClampedPage({
        currentPage: search.changesPage,
        totalPages: changesQuery.data?.totalPages,
        onPageChange: (page, options) => setSearch({ changesPage: page }, options),
    });

    useClampedPage({
        currentPage: search.productsPage,
        totalPages: productsQuery.data?.totalPages,
        onPageChange: (page, options) => setSearch({ productsPage: page }, options),
    });

    const { productColumns, changeColumns } = useRunDetailColumns({
        productLinkClassName: sectionStyles.productLink,
    });

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
                            Inspect one scrape run, its diff output, and the exact snapshot data persisted for that
                            execution.
                        </p>
                    </div>
                    <Link search={defaultRunsListSearch} to="/app/runs">
                        Back to runs
                    </Link>
                </div>
                <span className={sectionStyles.statusBadge} data-status={run.status}>
                    {formatStatusLabel(run.status)}
                </span>
            </div>

            <RunMetricsGrid
                items={[
                    { label: "Started", value: formatDateTime(run.startedAt) },
                    { label: "Completed", value: formatDateTime(run.completedAt) },
                    { label: "Duration", value: formatDuration(run.durationMs) },
                    { label: "Changes", value: run.totalChanges },
                ]}
            />

            {run.failure ? <RunFailurePanel failure={run.failure} isAdmin={isAdmin} /> : null}

            <RunMetricsGrid
                items={[
                    { label: "Total products", value: run.totalProducts },
                    { label: "New products", value: run.newProducts },
                    { label: "Price changes", value: run.priceChanges },
                    { label: "Sold out / Back in stock", value: `${run.soldOut} / ${run.backInStock}` },
                ]}
            />

            <RunChangesSection
                changeColumns={changeColumns}
                changeType={search.changeType}
                query={changesQueryInput}
                preorder={search.preorder}
                changes={changesQuery.data}
                errorMessage={changesQuery.isError ? changesQuery.error.message : undefined}
                isFetching={changesQuery.isFetching}
                isLoading={changesQuery.isPending}
                page={search.changesPage}
                pageSize={search.changesPageSize}
                onChangeTypeChange={(value) =>
                    setSearch({
                        changeType: value ? (value as typeof search.changeType) : undefined,
                        changesPage: 1,
                    })
                }
                onQueryChange={setChangesQueryInput}
                onPreorderChange={(value) => setSearch({ preorder: value, changesPage: 1 })}
                onPageChange={(nextPage) => setSearch({ changesPage: nextPage })}
                onRetry={() => void changesQuery.refetch()}
            />

            <RunProductsSection
                errorMessage={productsQuery.isError ? productsQuery.error.message : undefined}
                isFetching={productsQuery.isFetching}
                isLoading={productsQuery.isPending}
                page={search.productsPage}
                pageSize={search.productsPageSize}
                productColumns={productColumns}
                products={productsQuery.data}
                productsInStock={search.productsInStock}
                query={productsQueryInput}
                onProductsStockChange={(value) =>
                    setSearch({
                        productsInStock: value ? (value as typeof search.productsInStock) : undefined,
                        productsPage: 1,
                    })
                }
                onQueryChange={setProductsQueryInput}
                onPageChange={(nextPage) => setSearch({ productsPage: nextPage })}
            />
        </section>
    );
};
