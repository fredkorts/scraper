import type { AppSelectOption } from "../../../components/app-select/types/app-select.types";

export const RUN_STATUS_FILTER_OPTIONS: AppSelectOption[] = [
    { label: "Pending", value: "pending" },
    { label: "Running", value: "running" },
    { label: "Completed", value: "completed" },
    { label: "Failed", value: "failed" },
];

export const RUN_PAGE_SIZE_OPTIONS: AppSelectOption[] = [
    { label: "10", value: "10" },
    { label: "25", value: "25" },
    { label: "50", value: "50" },
];

export const RUN_CHANGE_TYPE_FILTER_OPTIONS: AppSelectOption[] = [
    { label: "Price decrease", value: "price_decrease" },
    { label: "Price increase", value: "price_increase" },
    { label: "New product", value: "new_product" },
    { label: "Sold out", value: "sold_out" },
    { label: "Back in stock", value: "back_in_stock" },
];

export const RUN_CHANGE_WINDOW_OPTIONS: AppSelectOption[] = [
    { label: "Last 24 hours", value: "1" },
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
];

export const RUN_PREORDER_FILTER_OPTIONS: AppSelectOption[] = [
    { label: "All products", value: "all" },
    { label: "Preorder only", value: "only" },
    { label: "Exclude preorders", value: "exclude" },
];

export const RUN_PRODUCT_STOCK_FILTER_OPTIONS: AppSelectOption[] = [
    { label: "In stock", value: "true" },
    { label: "Out of stock", value: "false" },
];
