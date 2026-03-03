import { z } from "zod";
import type { ProductHistoryData } from "./schemas";

export const PRODUCT_HISTORY_RANGE_VALUES = ["30d", "90d", "180d", "all"] as const;
export const PRODUCT_HISTORY_STOCK_FILTER_VALUES = ["all", "in_stock", "out_of_stock"] as const;

export type ProductHistoryRange = (typeof PRODUCT_HISTORY_RANGE_VALUES)[number];
export type ProductHistoryStockFilter = (typeof PRODUCT_HISTORY_STOCK_FILTER_VALUES)[number];

export interface ProductHistoryControls {
    range: ProductHistoryRange;
    categoryId?: string;
    stockFilter: ProductHistoryStockFilter;
    showOriginalPrice: boolean;
    showStockOverlay: boolean;
}

export interface ProductHistorySummary {
    pointCount: number;
    latestPrice?: number;
    minPrice?: number;
    maxPrice?: number;
    stockTransitions: number;
}

export const defaultProductHistoryControls: ProductHistoryControls = {
    range: "90d",
    categoryId: undefined,
    stockFilter: "all",
    showOriginalPrice: false,
    showStockOverlay: true,
};

const toBooleanFlag = (value: unknown, fallback: boolean): boolean => {
    if (value === true || value === "true") {
        return true;
    }

    if (value === false || value === "false") {
        return false;
    }

    return fallback;
};

const toOptionalString = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

export const parseProductHistoryControls = (search: Record<string, unknown>): ProductHistoryControls => {
    const range = toOptionalString(search.range);
    const stockFilter = toOptionalString(search.stockFilter);

    return {
        range: PRODUCT_HISTORY_RANGE_VALUES.includes(range as ProductHistoryRange)
            ? (range as ProductHistoryRange)
            : defaultProductHistoryControls.range,
        categoryId:
            (() => {
                const categoryId = toOptionalString(search.categoryId);
                return categoryId && z.string().uuid().safeParse(categoryId).success ? categoryId : undefined;
            })(),
        stockFilter: PRODUCT_HISTORY_STOCK_FILTER_VALUES.includes(stockFilter as ProductHistoryStockFilter)
            ? (stockFilter as ProductHistoryStockFilter)
            : defaultProductHistoryControls.stockFilter,
        showOriginalPrice: toBooleanFlag(search.showOriginalPrice, defaultProductHistoryControls.showOriginalPrice),
        showStockOverlay: toBooleanFlag(search.showStockOverlay, defaultProductHistoryControls.showStockOverlay),
    };
};

const rangeToMs = (range: ProductHistoryRange): number | null => {
    switch (range) {
        case "30d":
            return 30 * 24 * 60 * 60 * 1000;
        case "90d":
            return 90 * 24 * 60 * 60 * 1000;
        case "180d":
            return 180 * 24 * 60 * 60 * 1000;
        case "all":
            return null;
    }
};

export const filterProductHistoryItems = (
    items: ProductHistoryData["items"],
    controls: ProductHistoryControls,
    now = new Date(),
): ProductHistoryData["items"] => {
    const rangeWindowMs = rangeToMs(controls.range);
    const cutoffTime = rangeWindowMs === null ? null : now.getTime() - rangeWindowMs;

    return items.filter((item) => {
        if (controls.categoryId && item.categoryId !== controls.categoryId) {
            return false;
        }

        if (controls.stockFilter === "in_stock" && !item.inStock) {
            return false;
        }

        if (controls.stockFilter === "out_of_stock" && item.inStock) {
            return false;
        }

        if (cutoffTime !== null && new Date(item.scrapedAt).getTime() < cutoffTime) {
            return false;
        }

        return true;
    });
};

export const summarizeProductHistory = (items: ProductHistoryData["items"]): ProductHistorySummary => {
    if (items.length === 0) {
        return {
            pointCount: 0,
            latestPrice: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            stockTransitions: 0,
        };
    }

    const sortedItems = [...items].sort(
        (left, right) => new Date(left.scrapedAt).getTime() - new Date(right.scrapedAt).getTime(),
    );
    const prices = sortedItems.map((item) => item.price);

    let stockTransitions = 0;

    for (let index = 1; index < sortedItems.length; index += 1) {
        if (sortedItems[index]?.inStock !== sortedItems[index - 1]?.inStock) {
            stockTransitions += 1;
        }
    }

    return {
        pointCount: sortedItems.length,
        latestPrice: sortedItems[sortedItems.length - 1]?.price,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        stockTransitions,
    };
};
