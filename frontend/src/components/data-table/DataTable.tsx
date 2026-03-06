import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type RowData,
} from "@tanstack/react-table";
import type { DataTableProps } from "./types/data-table.types";
import styles from "./DataTable.module.scss";

export const DataTable = <TData extends RowData>({
    data,
    columns,
    emptyText = "No data available.",
}: DataTableProps<TData>) => {
    // TanStack Table exposes function-heavy state APIs, so this hook is intentionally exempt
    // from the React Compiler lint rule that targets memoization-unsafe libraries.
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable<TData>({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (table.getRowModel().rows.length === 0) {
        return <div className={styles.empty}>{emptyText}</div>;
    }

    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>
                <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th key={header.id} className={styles.headCell} scope="col">
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map((row) => (
                        <tr key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className={styles.cell}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
