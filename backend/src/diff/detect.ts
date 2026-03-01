import { ChangeType, Prisma } from "@prisma/client";
import type { DiffContext, DiffDetectionResult, PendingChangeItem } from "./types";

const isNewProductForRun = (firstSeenAt: Date, startedAt: Date, completedAt: Date): boolean =>
    firstSeenAt >= startedAt && firstSeenAt <= completedAt;

const dedupeChangeItems = (items: PendingChangeItem[]): PendingChangeItem[] => {
    const uniqueItems = new Map<string, PendingChangeItem>();

    for (const item of items) {
        uniqueItems.set(`${item.productId}:${item.changeType}`, item);
    }

    return [...uniqueItems.values()];
};

const comparePrices = (left: Prisma.Decimal | null, right: Prisma.Decimal | null): number | null => {
    if (left === null || right === null) {
        return null;
    }

    if (left.equals(right)) {
        return 0;
    }

    return left.greaterThan(right) ? 1 : -1;
};

export const detectDiffChanges = (context: DiffContext): DiffDetectionResult => {
    const pendingItems: PendingChangeItem[] = [];

    for (const current of context.currentProducts) {
        const previous = context.previousRunExists
            ? context.historicalSnapshotsByProductId.get(current.productId)
            : undefined;

        if (
            isNewProductForRun(
                current.product.firstSeenAt,
                context.scrapeRun.startedAt,
                context.scrapeRun.completedAt,
            )
        ) {
            pendingItems.push({
                productId: current.productId,
                changeType: ChangeType.NEW_PRODUCT,
                oldPrice: null,
                newPrice: current.snapshot.price,
                oldStockStatus: null,
                newStockStatus: current.snapshot.inStock,
            });
        }

        if (!previous) {
            continue;
        }

        const priceComparison = comparePrices(current.snapshot.price, previous.price);
        if (priceComparison === 1) {
            pendingItems.push({
                productId: current.productId,
                changeType: ChangeType.PRICE_INCREASE,
                oldPrice: previous.price,
                newPrice: current.snapshot.price,
                oldStockStatus: null,
                newStockStatus: null,
            });
        } else if (priceComparison === -1) {
            pendingItems.push({
                productId: current.productId,
                changeType: ChangeType.PRICE_DECREASE,
                oldPrice: previous.price,
                newPrice: current.snapshot.price,
                oldStockStatus: null,
                newStockStatus: null,
            });
        }

        if (previous.inStock && !current.snapshot.inStock) {
            pendingItems.push({
                productId: current.productId,
                changeType: ChangeType.SOLD_OUT,
                oldPrice: null,
                newPrice: null,
                oldStockStatus: previous.inStock,
                newStockStatus: current.snapshot.inStock,
            });
        } else if (!previous.inStock && current.snapshot.inStock) {
            pendingItems.push({
                productId: current.productId,
                changeType: ChangeType.BACK_IN_STOCK,
                oldPrice: null,
                newPrice: null,
                oldStockStatus: previous.inStock,
                newStockStatus: current.snapshot.inStock,
            });
        }
    }

    const changeItems = dedupeChangeItems(pendingItems);

    return {
        changeItems,
        soldOutCount: changeItems.filter((item) => item.changeType === ChangeType.SOLD_OUT).length,
        backInStockCount: changeItems.filter((item) => item.changeType === ChangeType.BACK_IN_STOCK)
            .length,
    };
};
