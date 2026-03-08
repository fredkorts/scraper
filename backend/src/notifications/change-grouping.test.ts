import { ChangeType } from "@prisma/client";
import { NotificationChangeCategory } from "@mabrik/shared";
import { describe, expect, it } from "vitest";
import {
    buildSectionSummaries,
    classifyChangeItem,
    groupChangeItems,
    NOTIFICATION_CHANGE_SECTION_ORDER,
} from "./change-grouping";
import type { ReportChangeItem } from "./types";

let itemSequence = 0;

type ReportChangeItemOverrides = Omit<Partial<ReportChangeItem>, "product"> & {
    product?: Partial<ReportChangeItem["product"]>;
};

const buildItem = (overrides: ReportChangeItemOverrides): ReportChangeItem => ({
    id: overrides.id ?? `item-${++itemSequence}`,
    changeType: overrides.changeType ?? ChangeType.NEW_PRODUCT,
    oldPrice: overrides.oldPrice ?? null,
    newPrice: overrides.newPrice ?? null,
    oldStockStatus: overrides.oldStockStatus ?? null,
    newStockStatus: overrides.newStockStatus ?? null,
    product: {
        id: `product-${itemSequence}`,
        name: "Product",
        externalUrl: "https://mabrik.ee/toode/product",
        imageUrl: "https://mabrik.ee/images/product.jpg",
        isPreorder: false,
        preorderEta: null,
        preorderDetectedFrom: null,
        ...overrides.product,
    },
});

describe("change grouping", () => {
    it("classifies known change types and fallback categories", () => {
        expect(classifyChangeItem(buildItem({ changeType: ChangeType.NEW_PRODUCT }))).toBe(
            NotificationChangeCategory.NEW_PRODUCT,
        );
        expect(classifyChangeItem(buildItem({ changeType: ChangeType.BACK_IN_STOCK }))).toBe(
            NotificationChangeCategory.BACK_IN_STOCK,
        );
        expect(classifyChangeItem(buildItem({ changeType: ChangeType.SOLD_OUT }))).toBe(
            NotificationChangeCategory.OUT_OF_STOCK,
        );
        expect(classifyChangeItem(buildItem({ changeType: ChangeType.PRICE_DECREASE }))).toBe(
            NotificationChangeCategory.PRICE_DROP,
        );
        expect(classifyChangeItem(buildItem({ changeType: ChangeType.PRICE_INCREASE }))).toBe(
            NotificationChangeCategory.PRICE_INCREASE,
        );
        expect(
            classifyChangeItem(
                buildItem({
                    changeType: "manual_review_removed_product" as ChangeType,
                }),
            ),
        ).toBe(NotificationChangeCategory.REMOVED);
    });

    it("applies stock precedence over price deltas", () => {
        const stockAndPriceItem = buildItem({
            changeType: "other_type" as ChangeType,
            oldStockStatus: false,
            newStockStatus: true,
            oldPrice: 20 as never,
            newPrice: 15 as never,
        });

        expect(classifyChangeItem(stockAndPriceItem)).toBe(NotificationChangeCategory.BACK_IN_STOCK);
    });

    it("orders grouped items deterministically by section rules", () => {
        const input: ReportChangeItem[] = [
            buildItem({
                id: "new-b",
                changeType: ChangeType.NEW_PRODUCT,
                product: {
                    id: "product-new-b",
                    name: "Zeta new",
                    externalUrl: "https://mabrik.ee/toode/new-b",
                    imageUrl: "https://mabrik.ee/images/new-b.jpg",
                },
            }),
            buildItem({
                id: "new-a",
                changeType: ChangeType.NEW_PRODUCT,
                product: {
                    id: "product-new-a",
                    name: "Alpha new",
                    externalUrl: "https://mabrik.ee/toode/new-a",
                    imageUrl: "https://mabrik.ee/images/new-a.jpg",
                },
            }),
            buildItem({
                id: "drop-small",
                changeType: ChangeType.PRICE_DECREASE,
                oldPrice: 100 as never,
                newPrice: 95 as never,
                product: {
                    id: "product-drop-small",
                    name: "Price drop small",
                    externalUrl: "https://mabrik.ee/toode/drop-small",
                    imageUrl: "https://mabrik.ee/images/drop-small.jpg",
                },
            }),
            buildItem({
                id: "drop-big",
                changeType: ChangeType.PRICE_DECREASE,
                oldPrice: 100 as never,
                newPrice: 50 as never,
                product: {
                    id: "product-drop-big",
                    name: "Price drop big",
                    externalUrl: "https://mabrik.ee/toode/drop-big",
                    imageUrl: "https://mabrik.ee/images/drop-big.jpg",
                },
            }),
            buildItem({
                id: "stock-b",
                changeType: ChangeType.BACK_IN_STOCK,
                product: {
                    id: "product-stock-b",
                    name: "Zulu stock",
                    externalUrl: "https://mabrik.ee/toode/stock-b",
                    imageUrl: "https://mabrik.ee/images/stock-b.jpg",
                },
            }),
            buildItem({
                id: "stock-a",
                changeType: ChangeType.BACK_IN_STOCK,
                product: {
                    id: "product-stock-a",
                    name: "Alpha stock",
                    externalUrl: "https://mabrik.ee/toode/stock-a",
                    imageUrl: "https://mabrik.ee/images/stock-a.jpg",
                },
            }),
        ];

        const grouped = groupChangeItems(input);

        expect(grouped[NotificationChangeCategory.NEW_PRODUCT].map((item) => item.id)).toEqual(["new-b", "new-a"]);
        expect(grouped[NotificationChangeCategory.PRICE_DROP].map((item) => item.id)).toEqual([
            "drop-big",
            "drop-small",
        ]);
        expect(grouped[NotificationChangeCategory.BACK_IN_STOCK].map((item) => item.id)).toEqual([
            "stock-a",
            "stock-b",
        ]);
    });

    it("builds section summaries in canonical order", () => {
        const grouped = groupChangeItems([
            buildItem({ changeType: ChangeType.PRICE_INCREASE }),
            buildItem({ changeType: ChangeType.NEW_PRODUCT }),
            buildItem({ changeType: ChangeType.PRICE_INCREASE }),
        ]);

        const summaries = buildSectionSummaries(grouped);

        expect(summaries.map((summary) => summary.category)).toEqual(
            NOTIFICATION_CHANGE_SECTION_ORDER.filter((category) => grouped[category].length > 0),
        );
        expect(summaries.map((summary) => `${summary.label}:${summary.count}`)).toEqual([
            "New products:1",
            "Price increases:2",
        ]);
    });
});
