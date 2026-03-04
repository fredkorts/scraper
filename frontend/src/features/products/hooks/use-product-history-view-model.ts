import { useMemo } from "react";
import type { ProductHistoryControls } from "../history-controls";
import {
    filterProductHistoryItems,
    summarizeProductHistory,
} from "../history-controls";
import { formatDateTime } from "../../runs/formatters";
import type { ProductHistoryData } from "../schemas";

export const useProductHistoryViewModel = (
    items: ProductHistoryData["items"],
    controls: ProductHistoryControls,
) => {
    const filteredHistoryItems = useMemo(
        () => filterProductHistoryItems(items, controls),
        [controls, items],
    );
    const historySummary = useMemo(
        () => summarizeProductHistory(filteredHistoryItems),
        [filteredHistoryItems],
    );

    const chartData = useMemo(
        () =>
            filteredHistoryItems.map((item) => ({
                id: item.id,
                categoryName: item.categoryName,
                fullDate: formatDateTime(item.scrapedAt),
                label: new Date(item.scrapedAt).toLocaleDateString(),
                price: item.price,
                originalPrice: item.originalPrice,
                stockLabel: item.inStock ? "In stock" : "Out of stock",
                stockValue: item.inStock ? 1 : 0,
            })),
        [filteredHistoryItems],
    );

    const availableCategoryOptions = useMemo(() => {
        const seen = new Map<string, string>();

        for (const item of items) {
            if (!seen.has(item.categoryId)) {
                seen.set(item.categoryId, item.categoryName);
            }
        }

        return [...seen.entries()].map(([id, name]) => ({ id, name }));
    }, [items]);

    const hasOriginalPriceData = filteredHistoryItems.some(
        (item) => item.originalPrice !== undefined,
    );
    const showOriginalPriceLine = controls.showOriginalPrice && hasOriginalPriceData;

    return {
        filteredHistoryItems,
        historySummary,
        chartData,
        availableCategoryOptions,
        hasOriginalPriceData,
        showOriginalPriceLine,
    };
};
