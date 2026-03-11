import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TableSearchInput } from "./TableSearchInput";

describe("TableSearchInput", () => {
    it("renders the controlled value and placeholder", () => {
        render(
            <TableSearchInput
                id="changes-search"
                ariaLabel="Search changes"
                placeholder="Search diff items"
                value="magic"
                onChange={() => undefined}
            />,
        );

        expect(screen.getByLabelText("Search changes")).toHaveValue("magic");
        expect(screen.getByPlaceholderText("Search diff items")).toBeInTheDocument();
    });

    it("forwards typed values and supports clear button", async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();

        render(
            <TableSearchInput
                id="products-search"
                ariaLabel="Search products"
                value="deadpool"
                clearAriaLabel="Clear product search"
                onChange={handleChange}
            />,
        );

        await user.type(screen.getByLabelText("Search products"), " tcg");
        expect(handleChange).toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Clear product search" }));
        expect(handleChange).toHaveBeenLastCalledWith("");
    });
});
