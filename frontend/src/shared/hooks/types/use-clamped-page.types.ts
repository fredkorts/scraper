export interface UseClampedPageOptions {
    currentPage: number;
    totalPages?: number;
    onPageChange: (nextPage: number, options?: { replace?: boolean }) => void;
}
