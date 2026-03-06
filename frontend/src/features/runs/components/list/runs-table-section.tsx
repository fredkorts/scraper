import { DataTable } from "../../../../components/data-table/DataTable";
import { PaginationControls } from "../../../../components/pagination/PaginationControls";
import styles from "./run-list-sections.module.scss";
import type { RunsTableSectionProps } from "../../types/run-list-sections.types";

export const RunsTableSection = ({
    columns,
    data,
    errorMessage,
    isFetching,
    isLoading,
    page,
    pageSize,
    onPageChange,
}: RunsTableSectionProps) => {
    if (errorMessage) {
        return (
            <p className={styles.errorState} role="alert">
                {errorMessage}
            </p>
        );
    }

    if (!data && isLoading) {
        return <p className={styles.emptyState}>Loading runs...</p>;
    }

    if (!data) {
        return <p className={styles.emptyState}>No runs available.</p>;
    }

    return (
        <div className={styles.section}>
            <div className={styles.tableControls}>
                <span className={styles.subtle}>{data.totalItems} total runs</span>
            </div>

            {data.items.length === 0 ? (
                <p className={styles.emptyState}>No runs matched the current filters.</p>
            ) : (
                <DataTable data={data.items} columns={columns} />
            )}

            <PaginationControls
                page={page}
                pageSize={pageSize}
                totalPages={data.totalPages}
                totalItems={data.totalItems}
                ariaLabel="Runs pagination"
                isLoading={isFetching}
                onPageChange={onPageChange}
            />
        </div>
    );
};
