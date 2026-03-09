import { Typography } from "antd";
import { DataTable } from "../../../../components/data-table/DataTable";
import type { ProductHistoryTableProps } from "../../types/product-detail-sections.types";

const HISTORY_TABLE_TITLE_ID = "history-table-heading";

export const ProductHistoryTable = ({ historyColumns, historyItems }: ProductHistoryTableProps) => (
    <section aria-labelledby={HISTORY_TABLE_TITLE_ID}>
        <Typography.Title id={HISTORY_TABLE_TITLE_ID} level={3}>
            History Table
        </Typography.Title>
        <DataTable data={historyItems} columns={historyColumns} emptyText="No matching history rows." />
    </section>
);
