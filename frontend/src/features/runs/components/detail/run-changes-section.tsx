import { AppSelect } from "../../../../components/app-select/AppSelect";
import { DataTable } from "../../../../components/data-table/DataTable";
import { PaginationControls } from "../../../../components/pagination/PaginationControls";
import { RUN_CHANGE_TYPE_FILTER_OPTIONS } from "../../constants/run-filters.constants";
import styles from "./run-detail-sections.module.scss";
import type { RunChangesSectionProps } from "../../types/run-detail-sections.types";

export const RunChangesSection = ({
    changeColumns,
    changes,
    changeType,
    errorMessage,
    isFetching,
    isLoading,
    page,
    pageSize,
    onChangeTypeChange,
    onPageChange,
}: RunChangesSectionProps) => (
    <section aria-labelledby="changes-heading" className={styles.section}>
        <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle} id="changes-heading">
                Diff Items
            </h2>
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
        </div>

        {errorMessage ? (
            <p className={styles.errorState} role="alert">
                {errorMessage}
            </p>
        ) : changes ? (
            <>
                {changes.items.length === 0 ? (
                    <p className={styles.emptyState}>No diff items matched the current filter.</p>
                ) : (
                    <DataTable columns={changeColumns} data={changes.items} />
                )}
                <PaginationControls
                    page={page}
                    pageSize={pageSize}
                    totalPages={changes.totalPages}
                    totalItems={changes.totalItems}
                    ariaLabel="Run changes pagination"
                    isLoading={isFetching}
                    onPageChange={onPageChange}
                />
            </>
        ) : isLoading ? (
            <p className={styles.emptyState}>Loading diff items...</p>
        ) : (
            <p className={styles.emptyState}>Loading diff items...</p>
        )}
    </section>
);
