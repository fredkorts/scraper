import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChangeDescription } from "../../../../shared/components/change-description/ChangeDescription";
import { buildCategoryTreeData, getCategoryLabelById } from "../../../categories";
import { useCategoriesQuery } from "../../../categories";
import { defaultProductHistoryControls } from "../../../products";
import { ChangesTableSection } from "../../components/shared/changes-table-section";
import { RUN_PREORDER_FILTER_OPTIONS, RUN_CHANGE_WINDOW_OPTIONS } from "../../constants/run-filters.constants";
import { useChangesListColumns } from "../../hooks/use-changes-list-columns";
import { formatChangeTypeLabel } from "../../formatters";
import { useChangesListQuery } from "../../queries";
import { defaultChangesListSearch, normalizeTableSearchQuery, parseChangeTypeFilterValues } from "../../search";
import { useDebouncedValue } from "../../../../shared/hooks/use-debounced-value";
import { useClampedPage } from "../../../../shared/hooks/use-clamped-page";
import { useRouteSearchUpdater } from "../../../../shared/hooks/use-route-search-updater";
import {
    PREORDER_EMPTY_FILTER_EXCLUDE_MESSAGE,
    PREORDER_EMPTY_FILTER_ONLY_MESSAGE,
} from "../../../../shared/constants/preorder.constants";
import styles from "../scrape-page-view.module.scss";
import { ChangesActiveFilterChips, type ActiveFilterChip } from "./components/ChangesActiveFilterChips";
import { ChangesFilterBar } from "./components/ChangesFilterBar";

const sortByLabelMap: Record<"changedAt" | "productName" | "categoryName", string> = {
    changedAt: "Changed at",
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
    const selectedChangeTypes = useMemo(() => parseChangeTypeFilterValues(search.changeType), [search.changeType]);
    const activeAdvancedCount =
        Number(search.preorder !== defaultChangesListSearch.preorder) +
        Number(search.windowDays !== defaultChangesListSearch.windowDays) +
        Number(search.pageSize !== defaultChangesListSearch.pageSize);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(activeAdvancedCount > 0);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    useEffect(() => {
        // URL search is the source of truth, so this sync keeps local input state aligned for back/forward navigation.
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

    useEffect(() => {
        setIsAdvancedOpen(activeAdvancedCount > 0);
    }, [activeAdvancedCount]);

    useClampedPage({
        currentPage: search.page,
        totalPages: changesQuery.data?.totalPages,
        onPageChange: (page, options) => setSearch({ page }, options),
    });

    const categoryTreeData = categoriesQuery.data ? buildCategoryTreeData(categoriesQuery.data.categories) : [];
    const selectedCategoryLabel = categoriesQuery.data
        ? getCategoryLabelById(categoriesQuery.data.categories, search.categoryId)
        : undefined;
    const windowLabel = useMemo(() => {
        const entry = RUN_CHANGE_WINDOW_OPTIONS.find((option) => Number(option.value) === search.windowDays);
        return entry?.label ?? "Last 7 days";
    }, [search.windowDays]);
    const preorderLabel = useMemo(() => {
        const entry = RUN_PREORDER_FILTER_OPTIONS.find((option) => option.value === search.preorder);
        return entry?.label ?? "All products";
    }, [search.preorder]);
    const pageSizeLabel = useMemo(() => String(search.pageSize), [search.pageSize]);

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
    });
    const activeFilterChips: ActiveFilterChip[] = useMemo(() => {
        const chips: ActiveFilterChip[] = [];

        for (const selectedChangeType of selectedChangeTypes) {
            const selectedChangeTypeLabel = formatChangeTypeLabel(selectedChangeType);
            chips.push({
                id: `changeType:${selectedChangeType}`,
                label: "Change type",
                value: selectedChangeTypeLabel,
                valueContent: <ChangeDescription label={selectedChangeTypeLabel} variant={selectedChangeType} />,
                hideLabel: true,
                onRemove: () => {
                    const remainingChangeTypes = selectedChangeTypes.filter((value) => value !== selectedChangeType);

                    setSearch({
                        changeType: remainingChangeTypes.length > 0 ? remainingChangeTypes.join(",") : undefined,
                        page: 1,
                    });
                },
            });
        }

        if (search.categoryId) {
            chips.push({
                id: "category",
                label: "Category",
                value: selectedCategoryLabel ?? "Selected category",
                onRemove: () => setSearch({ categoryId: undefined, page: 1 }),
            });
        }

        if (search.preorder !== defaultChangesListSearch.preorder) {
            chips.push({
                id: "preorder",
                label: "Preorder",
                value: preorderLabel,
                onRemove: () => setSearch({ preorder: defaultChangesListSearch.preorder, page: 1 }),
            });
        }

        if (search.windowDays !== defaultChangesListSearch.windowDays) {
            chips.push({
                id: "window",
                label: "Window",
                value: windowLabel,
                onRemove: () => setSearch({ windowDays: defaultChangesListSearch.windowDays, page: 1 }),
            });
        }

        if (search.pageSize !== defaultChangesListSearch.pageSize) {
            chips.push({
                id: "pageSize",
                label: "Page size",
                value: pageSizeLabel,
                onRemove: () => setSearch({ pageSize: defaultChangesListSearch.pageSize, page: 1 }),
            });
        }

        if (search.query) {
            chips.push({
                id: "query",
                label: "Search",
                value: search.query,
                onRemove: () => setSearch({ query: undefined, page: 1 }),
            });
        }

        return chips;
    }, [
        pageSizeLabel,
        preorderLabel,
        search.categoryId,
        search.pageSize,
        search.preorder,
        search.query,
        search.windowDays,
        selectedChangeTypes,
        selectedCategoryLabel,
        setSearch,
        windowLabel,
    ]);

    const showEmptyMismatchHelper =
        selectedChangeTypes.length > 0 && (changesQuery.data?.totalItems ?? 0) === 0 && !changesQuery.isError;

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

            <ChangesFilterBar
                categoryId={search.categoryId}
                query={queryInput}
                categoryTreeData={categoryTreeData}
                changeTypes={selectedChangeTypes}
                isAdvancedOpen={isAdvancedOpen}
                activeAdvancedCount={activeAdvancedCount}
                preorder={search.preorder}
                pageSize={search.pageSize}
                windowDays={search.windowDays}
                onToggleAdvanced={() => setIsAdvancedOpen((previous) => !previous)}
                onCategoryChange={(value) => setSearch({ categoryId: value, page: 1 })}
                onQueryChange={setQueryInput}
                onChangeTypeChange={(values) =>
                    setSearch({
                        changeType: values.length > 0 ? values.join(",") : undefined,
                        page: 1,
                    })
                }
                onPreorderChange={(value) => setSearch({ preorder: value, page: 1 })}
                onWindowDaysChange={(value) => setSearch({ windowDays: value, page: 1 })}
                onPageSizeChange={(value) => setSearch({ pageSize: value, page: 1 })}
                onReset={() =>
                    setSearch({
                        ...defaultChangesListSearch,
                        changeType: undefined,
                        categoryId: undefined,
                        query: undefined,
                    })
                }
            />

            <ChangesActiveFilterChips
                chips={activeFilterChips}
                sortingLabel={`${sortByLabelMap[search.sortBy]} (${sortOrderLabelMap[search.sortOrder]})`}
            />

            <ChangesTableSection
                columns={columns}
                data={changesQuery.data}
                emptyText={
                    search.preorder === "only"
                        ? PREORDER_EMPTY_FILTER_ONLY_MESSAGE
                        : search.preorder === "exclude"
                          ? PREORDER_EMPTY_FILTER_EXCLUDE_MESSAGE
                          : selectedChangeTypes.length > 0 || search.categoryId || search.query
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
                onRowClick={(item) =>
                    void navigate({
                        to: "/app/products/$productId",
                        params: { productId: item.product.id },
                        search: defaultProductHistoryControls,
                    })
                }
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
