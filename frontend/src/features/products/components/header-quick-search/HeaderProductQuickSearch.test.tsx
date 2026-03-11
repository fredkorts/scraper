import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderProductQuickSearch } from "./HeaderProductQuickSearch";

const navigateMock = vi.fn();
const useProductQuickSearchQueryMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => navigateMock,
    useRouterState: () => "/app",
}));

vi.mock("../../queries", () => ({
    useProductQuickSearchQuery: (params: unknown) => useProductQuickSearchQueryMock(params),
}));

vi.mock("../../../../shared/hooks/use-debounced-value", () => ({
    useDebouncedValue: <T,>(value: T) => value,
}));

describe("HeaderProductQuickSearch", () => {
    beforeEach(() => {
        navigateMock.mockReset();
        useProductQuickSearchQueryMock.mockReset();
        useProductQuickSearchQueryMock.mockReturnValue({
            data: { items: [] },
            isPending: false,
            isFetching: false,
            isError: false,
        });
    });

    it("starts collapsed and expands into a search input", async () => {
        const user = userEvent.setup();
        render(<HeaderProductQuickSearch />);

        expect(screen.getByRole("button", { name: "Open product search" })).toBeInTheDocument();
        expect(screen.queryByRole("combobox", { name: "Search products" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Open product search" }));

        expect(screen.getByRole("combobox", { name: "Search products" })).toBeInTheDocument();
    });

    it("shows matching results and navigates to product detail on selection", async () => {
        const user = userEvent.setup();
        useProductQuickSearchQueryMock.mockReturnValue({
            data: {
                items: [
                    {
                        id: "11111111-1111-4111-8111-111111111111",
                        name: "Magic Collector Box",
                        imageUrl: "https://example.com/magic.jpg",
                        categoryName: "Magic Decks",
                    },
                ],
            },
            isPending: false,
            isFetching: false,
            isError: false,
        });

        render(<HeaderProductQuickSearch />);
        await user.click(screen.getByRole("button", { name: "Open product search" }));
        await user.type(screen.getByRole("combobox", { name: "Search products" }), "magic");

        expect(await screen.findByRole("option", { name: /Magic Collector Box/ })).toBeInTheDocument();
        await user.click(screen.getByRole("option", { name: /Magic Collector Box/ }));

        expect(navigateMock).toHaveBeenCalledWith({
            to: "/app/products/$productId",
            params: {
                productId: "11111111-1111-4111-8111-111111111111",
            },
            search: {
                range: "90d",
                categoryId: undefined,
                stockFilter: "all",
                showOriginalPrice: false,
                showStockOverlay: true,
            },
        });
    });
});
