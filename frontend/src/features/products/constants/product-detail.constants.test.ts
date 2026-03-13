import { describe, expect, it } from "vitest";
import { PRODUCT_HISTORY_RANGE_OPTIONS, PRODUCT_HISTORY_STOCK_FILTER_OPTIONS } from "./product-detail.constants";

describe("product-detail constants", () => {
    it("defines stable history range options", () => {
        expect(PRODUCT_HISTORY_RANGE_OPTIONS).toEqual([
            { label: "30d", value: "30d" },
            { label: "90d", value: "90d" },
            { label: "180d", value: "180d" },
            { label: "All", value: "all" },
        ]);
    });

    it("defines stable stock filter options", () => {
        expect(PRODUCT_HISTORY_STOCK_FILTER_OPTIONS).toEqual([
            { label: "All stock states", value: "all" },
            { label: "In stock only", value: "in_stock" },
            { label: "Sold out only", value: "out_of_stock" },
        ]);
    });
});
