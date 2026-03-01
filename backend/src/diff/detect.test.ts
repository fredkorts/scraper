import { ChangeType, Prisma, ScrapeRunStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { detectDiffChanges } from "./detect";
import type { DiffContext } from "./types";

const decimal = (value: number): Prisma.Decimal => new Prisma.Decimal(value.toFixed(2));

const buildContext = (overrides: Partial<DiffContext> = {}): DiffContext => {
    const startedAt = new Date("2026-03-01T10:00:00.000Z");
    const completedAt = new Date("2026-03-01T10:05:00.000Z");

    return {
        scrapeRun: {
            id: "run-1",
            categoryId: "category-1",
            status: ScrapeRunStatus.COMPLETED,
            totalProducts: 0,
            newProducts: 0,
            priceChanges: 0,
            soldOut: 0,
            backInStock: 0,
            pagesScraped: 1,
            durationMs: 1000,
            errorMessage: null,
            startedAt,
            completedAt,
        },
        currentProducts: [],
        previousRunExists: false,
        historicalSnapshotsByProductId: new Map(),
        ...overrides,
    };
};

describe("detectDiffChanges", () => {
    it("emits new_product for first-seen products in the current run window", () => {
        const context = buildContext({
            currentProducts: [
                {
                    productId: "product-1",
                    product: {
                        id: "product-1",
                        externalUrl: "https://mabrik.ee/toode/new-game",
                        name: "New Game",
                        imageUrl: "https://mabrik.ee/images/new-game.jpg",
                        currentPrice: decimal(19.99),
                        originalPrice: null,
                        inStock: true,
                        firstSeenAt: new Date("2026-03-01T10:02:00.000Z"),
                    },
                    snapshot: {
                        id: "snapshot-1",
                        price: decimal(19.99),
                        originalPrice: null,
                        inStock: true,
                        scrapedAt: new Date("2026-03-01T10:02:00.000Z"),
                    },
                },
            ],
        });

        const result = detectDiffChanges(context);

        expect(result.changeItems).toHaveLength(1);
        expect(result.changeItems[0]).toMatchObject({
            productId: "product-1",
            changeType: ChangeType.NEW_PRODUCT,
        });
    });

    it("emits price increase and sold_out from explicit persisted stock change", () => {
        const context = buildContext({
            previousRunExists: true,
            currentProducts: [
                {
                    productId: "product-1",
                    product: {
                        id: "product-1",
                        externalUrl: "https://mabrik.ee/toode/test-game",
                        name: "Test Game",
                        imageUrl: "https://mabrik.ee/images/test-game.jpg",
                        currentPrice: decimal(14.99),
                        originalPrice: null,
                        inStock: false,
                        firstSeenAt: new Date("2026-02-20T10:00:00.000Z"),
                    },
                    snapshot: {
                        id: "snapshot-current",
                        price: decimal(14.99),
                        originalPrice: null,
                        inStock: false,
                        scrapedAt: new Date("2026-03-01T10:03:00.000Z"),
                    },
                },
            ],
            historicalSnapshotsByProductId: new Map([
                [
                    "product-1",
                    {
                        productId: "product-1",
                        price: decimal(12.99),
                        originalPrice: null,
                        inStock: true,
                        scrapedAt: new Date("2026-02-28T10:00:00.000Z"),
                    },
                ],
            ]),
        });

        const result = detectDiffChanges(context);

        expect(result.changeItems).toHaveLength(2);
        expect(result.changeItems.map((item) => item.changeType)).toEqual(
            expect.arrayContaining([ChangeType.PRICE_INCREASE, ChangeType.SOLD_OUT]),
        );
        expect(result.soldOutCount).toBe(1);
    });

    it("emits back_in_stock when historical stock was false and current stock is true", () => {
        const context = buildContext({
            previousRunExists: true,
            currentProducts: [
                {
                    productId: "product-1",
                    product: {
                        id: "product-1",
                        externalUrl: "https://mabrik.ee/toode/restocked-game",
                        name: "Restocked Game",
                        imageUrl: "https://mabrik.ee/images/restocked-game.jpg",
                        currentPrice: decimal(29.99),
                        originalPrice: null,
                        inStock: true,
                        firstSeenAt: new Date("2026-02-20T10:00:00.000Z"),
                    },
                    snapshot: {
                        id: "snapshot-current",
                        price: decimal(29.99),
                        originalPrice: null,
                        inStock: true,
                        scrapedAt: new Date("2026-03-01T10:03:00.000Z"),
                    },
                },
            ],
            historicalSnapshotsByProductId: new Map([
                [
                    "product-1",
                    {
                        productId: "product-1",
                        price: decimal(29.99),
                        originalPrice: null,
                        inStock: false,
                        scrapedAt: new Date("2026-02-28T10:00:00.000Z"),
                    },
                ],
            ]),
        });

        const result = detectDiffChanges(context);

        expect(result.changeItems).toHaveLength(1);
        expect(result.changeItems[0]).toMatchObject({
            changeType: ChangeType.BACK_IN_STOCK,
            oldStockStatus: false,
            newStockStatus: true,
        });
        expect(result.backInStockCount).toBe(1);
    });

    it("does not infer historical changes without a pre-run snapshot", () => {
        const context = buildContext({
            previousRunExists: true,
            currentProducts: [
                {
                    productId: "product-1",
                    product: {
                        id: "product-1",
                        externalUrl: "https://mabrik.ee/toode/uncharted-game",
                        name: "Uncharted Game",
                        imageUrl: "https://mabrik.ee/images/uncharted-game.jpg",
                        currentPrice: decimal(25.99),
                        originalPrice: null,
                        inStock: false,
                        firstSeenAt: new Date("2026-02-20T10:00:00.000Z"),
                    },
                    snapshot: {
                        id: "snapshot-current",
                        price: decimal(25.99),
                        originalPrice: null,
                        inStock: false,
                        scrapedAt: new Date("2026-03-01T10:03:00.000Z"),
                    },
                },
            ],
        });

        const result = detectDiffChanges(context);

        expect(result.changeItems).toHaveLength(0);
    });
});
