import { flexRender, getCoreRowModel, useReactTable, type RowData } from "@tanstack/react-table";
import type { MouseEvent } from "react";
import type { DataTableProps } from "./types/data-table.types";
import styles from "./DataTable.module.scss";

const INTERACTIVE_ROLE_SELECTOR = [
    '[role="button"]',
    '[role="link"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="tab"]',
].join(",");
const INTERACTIVE_ELEMENT_SELECTOR = ["a", "button", "input", "select", "textarea", INTERACTIVE_ROLE_SELECTOR].join(
    ",",
);

const isInteractiveTarget = (target: EventTarget | null): boolean =>
    target instanceof Element && target.closest(INTERACTIVE_ELEMENT_SELECTOR) !== null;

export const DataTable = <TData extends RowData>({
    data,
    columns,
    emptyText = "No data available.",
    onRowClick,
    isRowClickable,
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
                    {table.getRowModel().rows.map((row) => {
                        const rowData = row.original;
                        const clickable = Boolean(onRowClick) && (isRowClickable ? isRowClickable(rowData) : true);
                        const onClick = clickable
                            ? (event: MouseEvent<HTMLTableRowElement>) => {
                                  if (isInteractiveTarget(event.target)) {
                                      return;
                                  }

                                  onRowClick?.(rowData);
                              }
                            : undefined;

                        return (
                            <tr key={row.id} className={clickable ? styles.clickableRow : undefined} onClick={onClick}>
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className={styles.cell}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
