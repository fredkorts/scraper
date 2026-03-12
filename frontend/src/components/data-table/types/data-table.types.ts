import type { ColumnDef, RowData } from "@tanstack/react-table";

export interface DataTableProps<TData extends RowData> {
    data: TData[];
    columns: Array<ColumnDef<TData, unknown>>;
    emptyText?: string;
    onRowClick?: (row: TData) => void;
    isRowClickable?: (row: TData) => boolean;
}
