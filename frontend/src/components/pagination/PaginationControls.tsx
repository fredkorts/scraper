import { Button, Pagination } from "antd";
import type { PaginationControlsProps } from "./types/pagination-controls.types";
import styles from "./PaginationControls.module.scss";

const getRange = (page: number, pageSize: number, totalItems: number): { start: number; end: number } | undefined => {
    if (totalItems <= 0) {
        return undefined;
    }

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);

    return { start, end };
};

export const PaginationControls = ({
    page,
    pageSize,
    totalPages,
    totalItems,
    ariaLabel,
    isLoading = false,
    onPageChange,
}: PaginationControlsProps) => {
    const safeTotalPages = totalPages > 0 ? totalPages : 1;
    const safePage = Math.min(Math.max(page, 1), safeTotalPages);
    const range = getRange(safePage, pageSize, totalItems);

    const summaryText =
        range === undefined
            ? "No results."
            : `Page ${safePage} of ${safeTotalPages}. Showing ${range.start}-${range.end} of ${totalItems}.`;

    if (safeTotalPages <= 1) {
        return (
            <div className={styles.summary} data-loading={isLoading}>
                <span aria-live="polite">{summaryText}</span>
            </div>
        );
    }

    return (
        <div className={styles.wrapper} data-loading={isLoading}>
            <nav aria-label={ariaLabel} className={styles.controls}>
                <Button
                    htmlType="button"
                    aria-label="Go to first page"
                    disabled={isLoading || safePage <= 1}
                    onClick={() => onPageChange(1)}
                >
                    First page
                </Button>

                <Pagination
                    className={styles.antPagination}
                    current={safePage}
                    disabled={isLoading}
                    pageSize={pageSize}
                    responsive
                    showSizeChanger={false}
                    total={totalItems}
                    onChange={(nextPage) => onPageChange(nextPage)}
                />

                <Button
                    htmlType="button"
                    aria-label="Go to last page"
                    disabled={isLoading || safePage >= safeTotalPages}
                    onClick={() => onPageChange(safeTotalPages)}
                >
                    Last page
                </Button>
            </nav>

            <div className={styles.summary}>
                <span aria-live="polite">{summaryText}</span>
            </div>
        </div>
    );
};
