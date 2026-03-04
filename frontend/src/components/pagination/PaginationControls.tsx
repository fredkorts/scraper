import { useEffect, useMemo, useState } from "react";
import { buildPageWindow } from "./page-window";
import styles from "./PaginationControls.module.scss";

interface PaginationControlsProps {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    ariaLabel: string;
    isLoading?: boolean;
    onPageChange: (nextPage: number) => void;
}

const COMPACT_BREAKPOINT = "(max-width: 40rem)";

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
    const [compactMode, setCompactMode] = useState<boolean>(() =>
        typeof window !== "undefined" && typeof window.matchMedia === "function"
            ? window.matchMedia(COMPACT_BREAKPOINT).matches
            : false,
    );

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return;
        }

        const mediaQueryList = window.matchMedia(COMPACT_BREAKPOINT);
        const onChange = (event: MediaQueryListEvent) => {
            setCompactMode(event.matches);
        };

        setCompactMode(mediaQueryList.matches);
        mediaQueryList.addEventListener("change", onChange);

        return () => {
            mediaQueryList.removeEventListener("change", onChange);
        };
    }, []);

    const pageWindow = useMemo(
        () =>
            buildPageWindow({
                page: safePage,
                totalPages,
                siblingCount: compactMode ? 0 : 1,
                boundaryCount: 1,
            }),
        [compactMode, safePage, totalPages],
    );

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
                <button
                    type="button"
                    aria-label="Go to first page"
                    disabled={isLoading || safePage <= 1}
                    onClick={() => onPageChange(1)}
                >
                    First page
                </button>
                <button
                    type="button"
                    aria-label="Go to previous page"
                    disabled={isLoading || safePage <= 1}
                    onClick={() => onPageChange(Math.max(1, safePage - 1))}
                >
                    Previous page
                </button>

                {pageWindow.map((item) =>
                    item.kind === "ellipsis" ? (
                        <span key={item.id} aria-hidden="true" className={styles.ellipsis}>
                            ...
                        </span>
                    ) : (
                        <button
                            key={item.page}
                            type="button"
                            aria-current={item.page === safePage ? "page" : undefined}
                            aria-label={`Go to page ${item.page}`}
                            disabled={isLoading || item.page === safePage}
                            onClick={() => onPageChange(item.page)}
                        >
                            {item.page}
                        </button>
                    ),
                )}

                <button
                    type="button"
                    aria-label="Go to next page"
                    disabled={isLoading || safePage >= safeTotalPages}
                    onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
                >
                    Next page
                </button>
                <button
                    type="button"
                    aria-label="Go to last page"
                    disabled={isLoading || safePage >= safeTotalPages}
                    onClick={() => onPageChange(safeTotalPages)}
                >
                    Last page
                </button>
            </nav>

            <div className={styles.summary}>
                <span aria-live="polite">{summaryText}</span>
            </div>
        </div>
    );
};
