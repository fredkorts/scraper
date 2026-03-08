import type { ColumnDef, RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";

interface PaginatedItems<TItem> {
    items: TItem[];
    totalPages: number;
    totalItems: number;
}

export interface ChangesTableSectionProps<TItem extends RowData> {
    title: string;
    headingId: string;
    columns: Array<ColumnDef<TItem, unknown>>;
    data?: PaginatedItems<TItem>;
    page: number;
    pageSize: number;
    isFetching: boolean;
    isLoading: boolean;
    errorMessage?: string;
    headerContent?: ReactNode;
    emptyText?: string;
    loadingText?: string;
    retryLabel?: string;
    paginationAriaLabel: string;
    onPageChange: (page: number) => void;
    onRetry?: () => void;
}
