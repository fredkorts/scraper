export interface PaginationControlsProps {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    ariaLabel: string;
    isLoading?: boolean;
    onPageChange: (nextPage: number) => void;
}
