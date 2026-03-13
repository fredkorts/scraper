import { describe, expect, it } from "vitest";
import {
    RUN_CHANGE_TYPE_FILTER_OPTIONS,
    RUN_CHANGE_WINDOW_OPTIONS,
    RUN_PAGE_SIZE_OPTIONS,
    RUN_PREORDER_FILTER_OPTIONS,
    RUN_PRODUCT_STOCK_FILTER_OPTIONS,
    RUN_STATUS_FILTER_OPTIONS,
} from "./run-filters.constants";

describe("run filter constants", () => {
    it("defines run status options", () => {
        expect(RUN_STATUS_FILTER_OPTIONS).toEqual([
            { label: "Pending", value: "pending" },
            { label: "Running", value: "running" },
            { label: "Completed", value: "completed" },
            { label: "Failed", value: "failed" },
        ]);
    });

    it("defines run page-size options", () => {
        expect(RUN_PAGE_SIZE_OPTIONS).toEqual([
            { label: "10", value: "10" },
            { label: "25", value: "25" },
            { label: "50", value: "50" },
        ]);
    });

    it("defines change type options", () => {
        expect(RUN_CHANGE_TYPE_FILTER_OPTIONS).toEqual([
            { label: "Price decrease", value: "price_decrease" },
            { label: "Price increase", value: "price_increase" },
            { label: "New product", value: "new_product" },
            { label: "Sold Out", value: "sold_out" },
            { label: "Back in stock", value: "back_in_stock" },
        ]);
    });

    it("defines run stock options", () => {
        expect(RUN_PRODUCT_STOCK_FILTER_OPTIONS).toEqual([
            { label: "In stock", value: "true" },
            { label: "Sold Out", value: "false" },
        ]);
    });

    it("defines run change window options", () => {
        expect(RUN_CHANGE_WINDOW_OPTIONS).toEqual([
            { label: "Last 24 hours", value: "1" },
            { label: "Last 7 days", value: "7" },
            { label: "Last 30 days", value: "30" },
        ]);
    });

    it("defines preorder filter options", () => {
        expect(RUN_PREORDER_FILTER_OPTIONS).toEqual([
            { label: "All products", value: "all" },
            { label: "Preorder only", value: "only" },
            { label: "Exclude preorders", value: "exclude" },
        ]);
    });
});
