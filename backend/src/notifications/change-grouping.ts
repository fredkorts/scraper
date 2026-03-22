import { ChangeType, type ChangeItem } from "@prisma/client";
import { NotificationChangeCategory } from "@mabrik/shared";
import type { ReportChangeItem } from "./types";

export const NOTIFICATION_CHANGE_SECTION_ORDER: NotificationChangeCategory[] = [
    NotificationChangeCategory.NEW_PRODUCT,
    NotificationChangeCategory.BACK_IN_STOCK,
    NotificationChangeCategory.PRICE_DROP,
    NotificationChangeCategory.PRICE_INCREASE,
    NotificationChangeCategory.OUT_OF_STOCK,
    NotificationChangeCategory.REMOVED,
    NotificationChangeCategory.OTHER,
];

const NOTIFICATION_CHANGE_SECTION_LABELS: Record<NotificationChangeCategory, string> = {
    [NotificationChangeCategory.NEW_PRODUCT]: "New products",
    [NotificationChangeCategory.BACK_IN_STOCK]: "Back in stock",
    [NotificationChangeCategory.PRICE_DROP]: "Price drops",
    [NotificationChangeCategory.PRICE_INCREASE]: "Price increases",
    [NotificationChangeCategory.OUT_OF_STOCK]: "Out of stock",
    [NotificationChangeCategory.REMOVED]: "Removed / delisted",
    [NotificationChangeCategory.OTHER]: "Other changes",
};

const toNumberOrNull = (value: ReportChangeItem["oldPrice"] | ReportChangeItem["newPrice"]): number | null => {
    if (value === null || value === undefined) {
        return null;
    }

    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const getPriceDeltaAbsolutePercent = (item: ReportChangeItem): number => {
    const oldPrice = toNumberOrNull(item.oldPrice);
    const newPrice = toNumberOrNull(item.newPrice);

    if (oldPrice === null || newPrice === null || oldPrice === 0) {
        return 0;
    }

    return Math.abs((newPrice - oldPrice) / oldPrice);
};

const getCategoryByChangeType = (changeType: ChangeItem["changeType"]): NotificationChangeCategory | null => {
    if (changeType === ChangeType.NEW_PRODUCT) {
        return NotificationChangeCategory.NEW_PRODUCT;
    }

    if (changeType === ChangeType.BACK_IN_STOCK) {
        return NotificationChangeCategory.BACK_IN_STOCK;
    }

    if (changeType === ChangeType.SOLD_OUT) {
        return NotificationChangeCategory.OUT_OF_STOCK;
    }

    if (changeType === ChangeType.PRICE_DECREASE) {
        return NotificationChangeCategory.PRICE_DROP;
    }

    if (changeType === ChangeType.PRICE_INCREASE) {
        return NotificationChangeCategory.PRICE_INCREASE;
    }

    const normalizedType = String(changeType).toLowerCase();
    if (normalizedType.includes("removed") || normalizedType.includes("delisted")) {
        return NotificationChangeCategory.REMOVED;
    }

    return null;
};

export const classifyChangeItem = (item: ReportChangeItem): NotificationChangeCategory => {
    const byType = getCategoryByChangeType(item.changeType);
    if (byType) {
        return byType;
    }

    if (item.oldStockStatus === false && item.newStockStatus === true) {
        return NotificationChangeCategory.BACK_IN_STOCK;
    }

    if (item.oldStockStatus === true && item.newStockStatus === false) {
        return NotificationChangeCategory.OUT_OF_STOCK;
    }

    const oldPrice = toNumberOrNull(item.oldPrice);
    const newPrice = toNumberOrNull(item.newPrice);
    if (oldPrice !== null && newPrice !== null) {
        if (newPrice < oldPrice) {
            return NotificationChangeCategory.PRICE_DROP;
        }

        if (newPrice > oldPrice) {
            return NotificationChangeCategory.PRICE_INCREASE;
        }
    }

    return NotificationChangeCategory.OTHER;
};

const buildGroupedMap = (): Record<NotificationChangeCategory, ReportChangeItem[]> => ({
    [NotificationChangeCategory.NEW_PRODUCT]: [],
    [NotificationChangeCategory.BACK_IN_STOCK]: [],
    [NotificationChangeCategory.PRICE_DROP]: [],
    [NotificationChangeCategory.PRICE_INCREASE]: [],
    [NotificationChangeCategory.OUT_OF_STOCK]: [],
    [NotificationChangeCategory.REMOVED]: [],
    [NotificationChangeCategory.OTHER]: [],
});

const sortItemsForCategory = (
    category: NotificationChangeCategory,
    items: ReportChangeItem[],
    itemOrderById: Map<string, number>,
): ReportChangeItem[] => {
    if (category === NotificationChangeCategory.NEW_PRODUCT) {
        return [...items].sort((a, b) => (itemOrderById.get(a.id) ?? 0) - (itemOrderById.get(b.id) ?? 0));
    }

    if (category === NotificationChangeCategory.PRICE_DROP || category === NotificationChangeCategory.PRICE_INCREASE) {
        return [...items].sort((a, b) => {
            const deltaCompare = getPriceDeltaAbsolutePercent(b) - getPriceDeltaAbsolutePercent(a);
            if (deltaCompare !== 0) {
                return deltaCompare;
            }

            return a.product.name.localeCompare(b.product.name);
        });
    }

    return [...items].sort((a, b) => a.product.name.localeCompare(b.product.name));
};

export const groupChangeItems = (items: ReportChangeItem[]): Record<NotificationChangeCategory, ReportChangeItem[]> => {
    const grouped = buildGroupedMap();
    const itemOrderById = new Map(items.map((item, index) => [item.id, index]));

    for (const item of items) {
        grouped[classifyChangeItem(item)].push(item);
    }

    for (const category of NOTIFICATION_CHANGE_SECTION_ORDER) {
        grouped[category] = sortItemsForCategory(category, grouped[category], itemOrderById);
    }

    return grouped;
};

interface ChangeSectionSummary {
    category: NotificationChangeCategory;
    label: string;
    count: number;
}

export const buildSectionSummaries = (
    groupedItems: Record<NotificationChangeCategory, ReportChangeItem[]>,
): ChangeSectionSummary[] =>
    NOTIFICATION_CHANGE_SECTION_ORDER.reduce<ChangeSectionSummary[]>((summaries, category) => {
        const count = groupedItems[category].length;
        if (count === 0) {
            return summaries;
        }

        summaries.push({
            category,
            label: NOTIFICATION_CHANGE_SECTION_LABELS[category],
            count,
        });

        return summaries;
    }, []);
