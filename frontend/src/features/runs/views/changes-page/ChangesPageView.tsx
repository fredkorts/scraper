import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildCategoryTreeData, getCategoryLabelById } from "../../../categories";
import { useCategoriesQuery } from "../../../categories";
import { ChangesFilters } from "../../components/list/changes-filters";
import { ChangesTableSection } from "../../components/shared/changes-table-section";
import sectionStyles from "../../components/detail/run-detail-sections.module.scss";
import {
    RUN_CHANGE_TYPE_FILTER_OPTIONS,
    RUN_PREORDER_FILTER_OPTIONS,
    RUN_CHANGE_WINDOW_OPTIONS,
} from "../../constants/run-filters.constants";
import { useChangesListColumns } from "../../hooks/use-changes-list-columns";
import { useChangesListQuery } from "../../queries";
import { defaultChangesListSearch, normalizeTableSearchQuery } from "../../search";
import { useDebouncedValue } from "../../../../shared/hooks/use-debounced-value";
import { useClampedPage } from "../../../../shared/hooks/use-clamped-page";
import { useRouteSearchUpdater } from "../../../../shared/hooks/use-route-search-updater";
import {
    PREORDER_EMPTY_FILTER_EXCLUDE_MESSAGE,
    PREORDER_EMPTY_FILTER_ONLY_MESSAGE,
} from "../../../../shared/constants/preorder.constants";
import styles from "../scrape-page-view.module.scss";
import pageStyles from "./changes-page-view.module.scss";

const sortByLabelMap: Record<"changedAt" | "changeType" | "productName" | "categoryName", string> = {
    changedAt: "Changed at",
    changeType: "Change type",
    productName: "Product",
    categoryName: "Category",
};

const sortOrderLabelMap: Record<"asc" | "desc", string> = {
    asc: "Oldest first",
    desc: "Newest first",
};

export const ChangesPageView = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/changes" });
    const search = useSearch({ from: "/app/changes" });
    const categoriesQuery = useCategoriesQuery();
    const changesQuery = useChangesListQuery(search);
    const setSearch = useRouteSearchUpdater(navigate);
    const [queryInput, setQueryInput] = useState(search.query ?? "");
    const debouncedQueryInput = useDebouncedValue(queryInput, 350);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    useEffect(() => {
        // URL search is the source of truth, so this sync keeps local input state aligned for back/forward navigation.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQueryInput(search.query ?? "");
    }, [search.query]);

    useEffect(() => {
        const normalizedQuery = normalizeTableSearchQuery(debouncedQueryInput);

        if (normalizedQuery === search.query) {
            return;
        }

        setSearch(
            {
                query: normalizedQuery,
                page: 1,
            },
            { replace: true },
        );
    }, [debouncedQueryInput, search.query, setSearch]);

    useClampedPage({
        currentPage: search.page,
        totalPages: changesQuery.data?.totalPages,
        onPageChange: (page, options) => setSearch({ page }, options),
    });

    const categoryTreeData = categoriesQuery.data ? buildCategoryTreeData(categoriesQuery.data.categories) : [];
    const selectedCategoryLabel = categoriesQuery.data
        ? getCategoryLabelById(categoriesQuery.data.categories, search.categoryId)
        : undefined;
    const changeTypeLabel = useMemo(() => {
        const entry = RUN_CHANGE_TYPE_FILTER_OPTIONS.find((option) => option.value === search.changeType);
        return entry?.label ?? "All change types";
    }, [search.changeType]);
    const windowLabel = useMemo(() => {
        const entry = RUN_CHANGE_WINDOW_OPTIONS.find((option) => Number(option.value) === search.windowDays);
        return entry?.label ?? "Last 7 days";
    }, [search.windowDays]);
    const preorderLabel = useMemo(() => {
        const entry = RUN_PREORDER_FILTER_OPTIONS.find((option) => option.value === search.preorder);
        return entry?.label ?? "All products";
    }, [search.preorder]);

    const toggleSort = (sortBy: typeof search.sortBy) => {
        setSearch({
            sortBy,
            sortOrder: search.sortBy === sortBy && search.sortOrder === "desc" ? "asc" : "desc",
            page: 1,
        });
    };

    const columns = useChangesListColumns({
        sortBy: search.sortBy,
        sortOrder: search.sortOrder,
        onToggleSort: toggleSort,
        productLinkClassName: sectionStyles.productLink,
    });

    const showEmptyMismatchHelper =
        Boolean(search.changeType) && (changesQuery.data?.totalItems ?? 0) === 0 && !changesQuery.isError;

    return (
        <section className={styles.page}>
            <div className={styles.stack}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Changes Explorer
                </h1>
                <p className={styles.lede}>
                    Review product-level changes across runs with shared category, change-type, and time-window filters.
                </p>
            </div>

            <ChangesFilters
                categoryId={search.categoryId}
                query={queryInput}
                categoryTreeData={categoryTreeData}
                changeType={search.changeType}
                preorder={search.preorder}
                pageSize={search.pageSize}
                windowDays={search.windowDays}
                onCategoryChange={(value) => setSearch({ categoryId: value, page: 1 })}
                onQueryChange={setQueryInput}
                onChangeTypeChange={(value) => setSearch({ changeType: value, page: 1 })}
                onPreorderChange={(value) => setSearch({ preorder: value, page: 1 })}
                onWindowDaysChange={(value) => setSearch({ windowDays: value as 1 | 7 | 30, page: 1 })}
                onPageSizeChange={(value) => setSearch({ pageSize: Number(value), page: 1 })}
                onReset={() =>
                    setSearch({
                        ...defaultChangesListSearch,
                        changeType: undefined,
                        categoryId: undefined,
                        query: undefined,
                    })
                }
            />

            <div className={pageStyles.contextSummary}>
                <p>
                    Showing: <strong>{changeTypeLabel}</strong>
                </p>
                <p>
                    Category: <strong>{selectedCategoryLabel ?? "All tracked categories"}</strong>
                </p>
                <p>
                    Search: <strong>{search.query ?? "All rows"}</strong>
                </p>
                <p>
                    Window: <strong>{windowLabel}</strong>
                </p>
                <p>
                    Preorder: <strong>{preorderLabel}</strong>
                </p>
                <p>
                    Sorted by:{" "}
                    <strong>
                        {sortByLabelMap[search.sortBy]} ({sortOrderLabelMap[search.sortOrder]})
                    </strong>
                </p>
            </div>

            <ChangesTableSection
                columns={columns}
                data={changesQuery.data}
                emptyText={
                    search.preorder === "only"
                        ? PREORDER_EMPTY_FILTER_ONLY_MESSAGE
                        : search.preorder === "exclude"
                          ? PREORDER_EMPTY_FILTER_EXCLUDE_MESSAGE
                          : search.changeType || search.categoryId || search.query
                            ? "No changes matched the current filters. Adjust filters or reset all filters."
                            : "No changes were recorded for the selected window."
                }
                errorMessage={changesQuery.isError ? changesQuery.error.message : undefined}
                headingId="changes-table-heading"
                isFetching={changesQuery.isFetching}
                isLoading={changesQuery.isPending}
                page={search.page}
                pageSize={search.pageSize}
                paginationAriaLabel="Changes pagination"
                retryLabel="Retry loading changes"
                title="Change Results"
                onPageChange={(nextPage) => setSearch({ page: nextPage })}
                onRetry={() => void changesQuery.refetch()}
            />

            {showEmptyMismatchHelper ? (
                <p className={styles.subtle}>
                    Dashboard card totals are aggregate counts for the selected window. Additional filters may reduce
                    visible rows.
                </p>
            ) : null}
        </section>
    );
};
