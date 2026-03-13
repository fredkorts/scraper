export const PRODUCT_STALE_THRESHOLD_HOURS = 48;

export const PRODUCT_IMAGE_FALLBACK_DATA_URL =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' fill='%23f4f4f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2371717a' font-family='Arial' font-size='24'%3EImage unavailable%3C/text%3E%3C/svg%3E";

export const PRODUCT_HISTORY_RANGE_OPTIONS: Array<{
    label: string;
    value: "30d" | "90d" | "180d" | "all";
}> = [
    { label: "30d", value: "30d" },
    { label: "90d", value: "90d" },
    { label: "180d", value: "180d" },
    { label: "All", value: "all" },
];

export const PRODUCT_HISTORY_STOCK_FILTER_OPTIONS: Array<{
    label: string;
    value: "all" | "in_stock" | "out_of_stock";
}> = [
    { label: "All stock states", value: "all" },
    { label: "In stock only", value: "in_stock" },
    { label: "Sold out only", value: "out_of_stock" },
];
