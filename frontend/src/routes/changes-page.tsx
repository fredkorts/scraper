import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { AppButton } from "../components/app-button/AppButton";
import { buildCategoryTreeData, getCategoryLabelById } from "../features/categories/options";
import { useCategoriesQuery } from "../features/categories/queries";
import { ChangesFilters } from "../features/runs/components/list/changes-filters";
import { ChangesTableSection } from "../features/runs/components/shared/changes-table-section";
import sectionStyles from "../features/runs/components/detail/run-detail-sections.module.scss";
import {
    RUN_CHANGE_TYPE_FILTER_OPTIONS,
    RUN_PREORDER_FILTER_OPTIONS,
    RUN_CHANGE_WINDOW_OPTIONS,
} from "../features/runs/constants/run-filters.constants";
import { useChangesListColumns } from "../features/runs/hooks/use-changes-list-columns";
import { useChangesListQuery } from "../features/runs/queries";
import { defaultChangesListSearch } from "../features/runs/search";
import { useClampedPage } from "../shared/hooks/use-clamped-page";
import { useRouteSearchUpdater } from "../shared/hooks/use-route-search-updater";
import styles from "./scrape-views.module.scss";
import pageStyles from "./changes-page.module.scss";

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

export const ChangesPage = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/changes" });
    const search = useSearch({ from: "/app/changes" });
    const categoriesQuery = useCategoriesQuery();
    const changesQuery = useChangesListQuery(search);
    const setSearch = useRouteSearchUpdater(navigate);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

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
                categoryTreeData={categoryTreeData}
                changeType={search.changeType}
                preorder={search.preorder}
                pageSize={search.pageSize}
                windowDays={search.windowDays}
                onCategoryChange={(value) => setSearch({ categoryId: value, page: 1 })}
                onChangeTypeChange={(value) => setSearch({ changeType: value, page: 1 })}
                onPreorderChange={(value) => setSearch({ preorder: value, page: 1 })}
                onWindowDaysChange={(value) => setSearch({ windowDays: value as 1 | 7 | 30, page: 1 })}
                onPageSizeChange={(value) => setSearch({ pageSize: Number(value), page: 1 })}
                onReset={() =>
                    setSearch({
                        ...defaultChangesListSearch,
                        changeType: undefined,
                        categoryId: undefined,
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

            {changesQuery.isError ? (
                <div className={pageStyles.retryRow}>
                    <AppButton intent="secondary" onClick={() => void changesQuery.refetch()}>
                        Retry
                    </AppButton>
                </div>
            ) : null}

            <ChangesTableSection
                columns={columns}
                data={changesQuery.data}
                emptyText={
                    search.changeType || search.categoryId
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
                title="Change Results"
                onPageChange={(nextPage) => setSearch({ page: nextPage })}
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
