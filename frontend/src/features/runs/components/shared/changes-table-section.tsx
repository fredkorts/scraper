import { DataTable } from "../../../../components/data-table/DataTable";
import { PaginationControls } from "../../../../components/pagination/PaginationControls";
import styles from "../detail/run-detail-sections.module.scss";
import type { ChangesTableSectionProps } from "../../types/changes-table-section.types";

export const ChangesTableSection = <TItem extends object>({
    title,
    headingId,
    headerContent,
    columns,
    data,
    page,
    pageSize,
    isFetching,
    isLoading,
    errorMessage,
    emptyText = "No changes matched the current filters.",
    loadingText = "Loading changes...",
    paginationAriaLabel,
    onPageChange,
}: ChangesTableSectionProps<TItem>) => (
    <section aria-labelledby={headingId} className={styles.section}>
        <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle} id={headingId}>
                {title}
            </h2>
            {headerContent}
        </div>

        {errorMessage ? (
            <p className={styles.errorState} role="alert">
                {errorMessage}
            </p>
        ) : data ? (
            <>
                {data.items.length === 0 ? (
                    <p className={styles.emptyState}>{emptyText}</p>
                ) : (
                    <DataTable columns={columns} data={data.items} />
                )}
                <PaginationControls
                    page={page}
                    pageSize={pageSize}
                    totalPages={data.totalPages}
                    totalItems={data.totalItems}
                    ariaLabel={paginationAriaLabel}
                    isLoading={isFetching}
                    onPageChange={onPageChange}
                />
            </>
        ) : isLoading ? (
            <p className={styles.emptyState}>{loadingText}</p>
        ) : (
            <p className={styles.emptyState}>{loadingText}</p>
        )}
    </section>
);
