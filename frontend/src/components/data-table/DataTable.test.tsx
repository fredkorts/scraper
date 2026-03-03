import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { DataTable } from "./DataTable";

interface Row {
    name: string;
    status: string;
}

const columnHelper = createColumnHelper<Row>();
const columns = [
    columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => info.getValue(),
    }),
] satisfies Array<ColumnDef<Row, unknown>>;

describe("DataTable", () => {
    it("renders rows and columns", () => {
        render(
            <DataTable
                data={[
                    { name: "Run A", status: "completed" },
                    { name: "Run B", status: "running" },
                ]}
                columns={columns}
            />,
        );

        expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
        expect(screen.getByText("Run A")).toBeInTheDocument();
        expect(screen.getByText("running")).toBeInTheDocument();
    });

    it("renders empty state", () => {
        render(<DataTable<Row> data={[]} columns={columns} emptyText="No runs" />);

        expect(screen.getByText("No runs")).toBeInTheDocument();
    });
});
