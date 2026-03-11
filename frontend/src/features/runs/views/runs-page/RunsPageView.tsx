import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { buildCategoryTreeData } from "../../../categories";
import { useCategoriesQuery } from "../../../categories";
import { RunsFilters } from "../../components/list/runs-filters";
import runListStyles from "../../components/list/run-list-sections.module.scss";
import { RunsTableSection } from "../../components/list/runs-table-section";
import { useRunsTableColumns } from "../../hooks/use-runs-table-columns";
import { useRunsListQuery } from "../../queries";
import { useClampedPage } from "../../../../shared/hooks/use-clamped-page";
import { useRouteSearchUpdater } from "../../../../shared/hooks/use-route-search-updater";
import styles from "../scrape-page-view.module.scss";

export const RunsPageView = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/runs" });
    const search = useSearch({ from: "/app/runs" });
    const categoriesQuery = useCategoriesQuery();
    const runsQuery = useRunsListQuery(search);
    const categoryTreeData = categoriesQuery.data ? buildCategoryTreeData(categoriesQuery.data.categories) : [];
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
        statusBadgeClassName: runListStyles.statusBadge,
    });

    return (
        <section className={styles.page}>
            <div className={styles.stack}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Scrape Runs
                </h1>
                <p className={styles.lede}>
                    Review past scrape executions for your tracked categories, inspect failures, and drill into the
                    exact diff output.
                </p>
            </div>

            <RunsFilters
                categoryId={search.categoryId}
                categoryTreeData={categoryTreeData}
                pageSize={search.pageSize}
                status={search.status}
                onCategoryChange={(value) => setSearch({ categoryId: value, page: 1 })}
                onPageSizeChange={(value) => setSearch({ pageSize: Number(value), page: 1 })}
                onStatusChange={(value) =>
                    setSearch({
                        status: value ? (value as typeof search.status) : undefined,
                        page: 1,
                    })
                }
            />

            <RunsTableSection
                columns={columns}
                data={runsQuery.data}
                errorMessage={runsQuery.isError ? runsQuery.error.message : undefined}
                isFetching={runsQuery.isFetching}
                isLoading={runsQuery.isPending}
                page={search.page}
                pageSize={search.pageSize}
                onPageChange={(nextPage) => setSearch({ page: nextPage })}
            />
        </section>
    );
};
