import {
    defaultProductHistoryControls,
    filterProductHistoryItems,
    parseProductHistoryControls,
    summarizeProductHistory,
} from "./history-controls";

const baseHistoryItems = [
    {
        id: "11111111-1111-4111-8111-111111111111",
        scrapeRunId: "22222222-2222-4222-8222-222222222222",
        categoryId: "33333333-3333-4333-8333-333333333333",
        categoryName: "Board Games",
        price: 29.99,
        originalPrice: 34.99,
        inStock: true,
        scrapedAt: "2026-01-01T10:00:00.000Z",
    },
    {
        id: "44444444-4444-4444-8444-444444444444",
        scrapeRunId: "55555555-5555-4555-8555-555555555555",
        categoryId: "33333333-3333-4333-8333-333333333333",
        categoryName: "Board Games",
        price: 24.99,
        originalPrice: 29.99,
        inStock: false,
        scrapedAt: "2026-02-15T10:00:00.000Z",
    },
    {
        id: "66666666-6666-4666-8666-666666666666",
        scrapeRunId: "77777777-7777-4777-8777-777777777777",
        categoryId: "88888888-8888-4888-8888-888888888888",
        categoryName: "Card Games",
        price: 19.99,
        originalPrice: 24.99,
        inStock: true,
        scrapedAt: "2026-03-01T10:00:00.000Z",
    },
] as const;

describe("product history controls", () => {
    it("parses valid control state from URL-like input", () => {
        const parsed = parseProductHistoryControls({
            range: "30d",
            categoryId: "33333333-3333-4333-8333-333333333333",
            stockFilter: "out_of_stock",
            showOriginalPrice: "true",
            showStockOverlay: "false",
        });

        expect(parsed).toEqual({
            range: "30d",
            categoryId: "33333333-3333-4333-8333-333333333333",
            stockFilter: "out_of_stock",
            showOriginalPrice: true,
            showStockOverlay: false,
        });
    });

    it("falls back to defaults for invalid control values", () => {
        const parsed = parseProductHistoryControls({
            range: "500d",
            stockFilter: "unknown",
            showOriginalPrice: "not-a-boolean",
            showStockOverlay: 10,
        });

        expect(parsed).toEqual(defaultProductHistoryControls);
    });

    it("filters history by date range relative to now", () => {
        const filtered = filterProductHistoryItems(
            [...baseHistoryItems],
            {
                ...defaultProductHistoryControls,
                range: "30d",
            },
            new Date("2026-03-20T10:00:00.000Z"),
        );

        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.id).toBe("66666666-6666-4666-8666-666666666666");
    });

    it("filters history by category and stock state together", () => {
        const filtered = filterProductHistoryItems(
            [...baseHistoryItems],
            {
                ...defaultProductHistoryControls,
                range: "all",
                categoryId: "33333333-3333-4333-8333-333333333333",
                stockFilter: "out_of_stock",
            },
            new Date("2026-03-10T10:00:00.000Z"),
        );

        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.categoryName).toBe("Board Games");
        expect(filtered[0]?.inStock).toBe(false);
    });

    it("summarizes latest price, range, and stock transitions from ordered history", () => {
        const summary = summarizeProductHistory([...baseHistoryItems]);

        expect(summary).toEqual({
            pointCount: 3,
            latestPrice: 19.99,
            minPrice: 19.99,
            maxPrice: 29.99,
            stockTransitions: 2,
        });
    });

    it("returns an empty summary for empty history", () => {
        expect(summarizeProductHistory([])).toEqual({
            pointCount: 0,
            latestPrice: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            stockTransitions: 0,
        });
    });
});
