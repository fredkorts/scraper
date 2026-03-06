import { useEffect } from "react";
import type { UseClampedPageOptions } from "./types/use-clamped-page.types";

export const useClampedPage = ({
    currentPage,
    totalPages,
    onPageChange,
}: UseClampedPageOptions) => {
    useEffect(() => {
        if (totalPages === undefined) {
            return;
        }

        if (totalPages === 0 && currentPage !== 1) {
            onPageChange(1, { replace: true });
            return;
        }

        if (totalPages > 0 && currentPage > totalPages) {
            onPageChange(totalPages, { replace: true });
        }
    }, [currentPage, onPageChange, totalPages]);
};
