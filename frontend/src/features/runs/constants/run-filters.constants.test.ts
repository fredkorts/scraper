import { describe, expect, it } from "vitest";
import {
    RUN_CHANGE_TYPE_FILTER_OPTIONS,
    RUN_PAGE_SIZE_OPTIONS,
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
            { label: "Sold out", value: "sold_out" },
            { label: "Back in stock", value: "back_in_stock" },
        ]);
    });

    it("defines run stock options", () => {
        expect(RUN_PRODUCT_STOCK_FILTER_OPTIONS).toEqual([
            { label: "In stock", value: "true" },
            { label: "Out of stock", value: "false" },
        ]);
    });
});
