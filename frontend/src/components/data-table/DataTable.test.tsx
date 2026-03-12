import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
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

    it("calls onRowClick for non-interactive clicks", async () => {
        const onRowClick = vi.fn();
        const user = userEvent.setup();

        render(
            <DataTable
                data={[
                    { name: "Run A", status: "completed" },
                    { name: "Run B", status: "running" },
                ]}
                columns={columns}
                onRowClick={onRowClick}
            />,
        );

        await user.click(screen.getByText("Run A"));

        expect(onRowClick).toHaveBeenCalledTimes(1);
        expect(onRowClick).toHaveBeenCalledWith({ name: "Run A", status: "completed" });
        expect(screen.getByText("Run A").closest("tr")?.className).toMatch(/clickableRow/);
    });

    it("does not call onRowClick for interactive cell descendants", async () => {
        const onRowClick = vi.fn();
        const user = userEvent.setup();
        const interactiveColumns = [
            columnHelper.accessor("name", {
                header: "Name",
                cell: (info) => info.getValue(),
            }),
            columnHelper.display({
                id: "actions",
                header: "Actions",
                cell: () => <button type="button">Open</button>,
            }),
        ] satisfies Array<ColumnDef<Row, unknown>>;

        render(
            <DataTable
                data={[{ name: "Run A", status: "completed" }]}
                columns={interactiveColumns}
                onRowClick={onRowClick}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        expect(onRowClick).not.toHaveBeenCalled();
    });

    it("applies clickable-row styling only to rows allowed by isRowClickable", () => {
        render(
            <DataTable
                data={[
                    { name: "Run A", status: "completed" },
                    { name: "Run B", status: "running" },
                ]}
                columns={columns}
                onRowClick={() => {}}
                isRowClickable={(row) => row.status === "completed"}
            />,
        );

        expect(screen.getByText("Run A").closest("tr")?.className).toMatch(/clickableRow/);
        expect(screen.getByText("Run B").closest("tr")?.className ?? "").not.toMatch(/clickableRow/);
    });
});
