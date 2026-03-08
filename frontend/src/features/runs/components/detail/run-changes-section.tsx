import { AppSelect } from "../../../../components/app-select/AppSelect";
import { ChangesTableSection } from "../shared/changes-table-section";
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
    <ChangesTableSection
        columns={changeColumns}
        data={changes}
        emptyText="No diff items matched the current filter."
        errorMessage={errorMessage}
        headingId="changes-heading"
        isFetching={isFetching}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        paginationAriaLabel="Run changes pagination"
        title="Diff Items"
        onPageChange={onPageChange}
        headerContent={
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
        }
        loadingText="Loading diff items..."
    />
);
