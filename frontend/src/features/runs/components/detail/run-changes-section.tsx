import { AppSelect } from "../../../../components/app-select/AppSelect";
import { TableSearchInput } from "../../../../components/table-search-input/TableSearchInput";
import { ChangesTableSection } from "../shared/changes-table-section";
import { RUN_CHANGE_TYPE_FILTER_OPTIONS, RUN_PREORDER_FILTER_OPTIONS } from "../../constants/run-filters.constants";
import {
    PREORDER_EMPTY_FILTER_EXCLUDE_MESSAGE,
    PREORDER_EMPTY_FILTER_ONLY_MESSAGE,
} from "../../../../shared/constants/preorder.constants";
import { TABLE_SEARCH_QUERY_MAX_LENGTH } from "../../../../shared/search/query";
import styles from "./run-detail-sections.module.scss";
import type { RunChangesSectionProps } from "../../types/run-detail-sections.types";

export const RunChangesSection = ({
    changeColumns,
    changes,
    changeType,
    query,
    preorder,
    errorMessage,
    isFetching,
    isLoading,
    page,
    pageSize,
    onChangeTypeChange,
    onQueryChange,
    onPreorderChange,
    onPageChange,
    onRetry,
}: RunChangesSectionProps) => (
    <ChangesTableSection
        columns={changeColumns}
        data={changes}
        emptyText={
            preorder === "only"
                ? PREORDER_EMPTY_FILTER_ONLY_MESSAGE
                : preorder === "exclude"
                  ? PREORDER_EMPTY_FILTER_EXCLUDE_MESSAGE
                  : "No diff items matched the current filter."
        }
        errorMessage={errorMessage}
        headingId="changes-heading"
        isFetching={isFetching}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        paginationAriaLabel="Run changes pagination"
        retryLabel="Retry loading diff items"
        title="Diff Items"
        onPageChange={onPageChange}
        onRetry={onRetry}
        headerContent={
            <div className={styles.filterRow}>
                <div className={styles.filterGroup}>
                    <label className={styles.label} htmlFor="change-type-filter">
                        Change type
                    </label>
                    <AppSelect
                        allowClear
                        ariaLabel="Change type"
                        className={styles.select}
                        id="change-type-filter"
                        options={RUN_CHANGE_TYPE_FILTER_OPTIONS}
                        placeholder="All change types"
                        value={changeType}
                        onChange={(value) => onChangeTypeChange(value || undefined)}
                    />
                </div>
                <div className={styles.filterGroup}>
                    <label className={styles.label} htmlFor="run-changes-search-filter">
                        Search
                    </label>
                    <TableSearchInput
                        id="run-changes-search-filter"
                        ariaLabel="Search diff items"
                        placeholder="Search diff items"
                        value={query}
                        maxLength={TABLE_SEARCH_QUERY_MAX_LENGTH}
                        onChange={onQueryChange}
                    />
                </div>
                <div className={styles.filterGroup}>
                    <label className={styles.label} htmlFor="change-preorder-filter">
                        Preorder
                    </label>
                    <AppSelect
                        ariaLabel="Preorder"
                        className={styles.select}
                        id="change-preorder-filter"
                        options={RUN_PREORDER_FILTER_OPTIONS}
                        value={preorder}
                        onChange={(value) => onPreorderChange((value as "all" | "only" | "exclude") || "all")}
                    />
                </div>
            </div>
        }
        loadingText="Loading diff items..."
    />
);
