import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaginationControls } from "./PaginationControls";

describe("PaginationControls", () => {
    it("renders summary-only state for a single page", () => {
        render(
            <PaginationControls
                page={1}
                pageSize={25}
                totalPages={1}
                totalItems={9}
                ariaLabel="Runs pagination"
                onPageChange={() => {}}
            />,
        );

        expect(screen.getByText("Page 1 of 1. Showing 1-9 of 9.")).toBeInTheDocument();
        expect(screen.queryByRole("navigation", { name: "Runs pagination" })).not.toBeInTheDocument();
    });

    it("disables edge controls on first page", () => {
        render(
            <PaginationControls
                page={1}
                pageSize={25}
                totalPages={5}
                totalItems={110}
                ariaLabel="Runs pagination"
                onPageChange={() => {}}
            />,
        );

        expect(screen.getByRole("button", { name: "Go to first page" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Go to last page" })).toBeEnabled();
    });

    it("renders the active page in Ant pagination", () => {
        render(
            <PaginationControls
                page={3}
                pageSize={25}
                totalPages={9}
                totalItems={215}
                ariaLabel="Runs pagination"
                onPageChange={() => {}}
            />,
        );

        expect(document.querySelector(".ant-pagination-item-active")?.textContent).toContain("3");
    });

    it("emits page changes when custom and Ant controls are clicked", async () => {
        const user = userEvent.setup();
        const onPageChange = vi.fn();

        render(
            <PaginationControls
                page={3}
                pageSize={25}
                totalPages={10}
                totalItems={240}
                ariaLabel="Runs pagination"
                onPageChange={onPageChange}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Go to first page" }));
        await user.click(screen.getByText("4"));
        await user.click(screen.getByRole("button", { name: "Go to last page" }));

        expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
        expect(onPageChange).toHaveBeenNthCalledWith(2, 4);
        expect(onPageChange).toHaveBeenNthCalledWith(3, 10);
    });

    it("disables all controls while loading", () => {
        render(
            <PaginationControls
                page={2}
                pageSize={25}
                totalPages={5}
                totalItems={110}
                ariaLabel="Runs pagination"
                isLoading
                onPageChange={() => {}}
            />,
        );

        expect(screen.getByRole("button", { name: "Go to first page" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Go to last page" })).toBeDisabled();
        expect(document.querySelector(".ant-pagination-disabled")).toBeInTheDocument();
    });
});
