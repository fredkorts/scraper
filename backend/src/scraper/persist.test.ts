import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { persistScrapeResults } from "./persist";

useTestDatabase();

const createCategory = async () =>
    prisma.category.create({
        data: {
            slug: "lauamangud",
            nameEt: "Lauamangud",
            nameEn: "Board Games",
            isActive: true,
            scrapeIntervalHours: 12,
        },
    });

describe("persistScrapeResults", () => {
    it("creates products, category links, and snapshots on first scrape", async () => {
        const category = await createCategory();
        const scrapeRun = await prisma.scrapeRun.create({
            data: {
                categoryId: category.id,
                status: "RUNNING",
            },
        });

        const result = await persistScrapeResults({
            scrapeRunId: scrapeRun.id,
            categoryId: category.id,
            categorySlug: category.slug,
            pagesScraped: 1,
            parserWarnings: [],
            products: [
                {
                    externalUrl: "https://mabrik.ee/toode/test-game",
                    name: "Test Game",
                    imageUrl: "https://mabrik.ee/images/test-game.jpg",
                    currentPrice: "29.99",
                    inStock: true,
                },
            ],
        });

        const products = await prisma.product.findMany();
        const links = await prisma.productCategory.findMany();
        const snapshots = await prisma.productSnapshot.findMany();

        expect(result.totalProducts).toBe(1);
        expect(result.newProducts).toBe(1);
        expect(products).toHaveLength(1);
        expect(links).toHaveLength(1);
        expect(snapshots).toHaveLength(1);
    });

    it("does not create duplicate snapshots when data is unchanged", async () => {
        const category = await createCategory();
        const firstRun = await prisma.scrapeRun.create({
            data: {
                categoryId: category.id,
                status: "RUNNING",
            },
        });

        await persistScrapeResults({
            scrapeRunId: firstRun.id,
            categoryId: category.id,
            categorySlug: category.slug,
            pagesScraped: 1,
            parserWarnings: [],
            products: [
                {
                    externalUrl: "https://mabrik.ee/toode/test-game",
                    name: "Test Game",
                    imageUrl: "https://mabrik.ee/images/test-game.jpg",
                    currentPrice: "29.99",
                    inStock: true,
                },
            ],
        });

        const secondRun = await prisma.scrapeRun.create({
            data: {
                categoryId: category.id,
                status: "RUNNING",
            },
        });

        const result = await persistScrapeResults({
            scrapeRunId: secondRun.id,
            categoryId: category.id,
            categorySlug: category.slug,
            pagesScraped: 1,
            parserWarnings: [],
            products: [
                {
                    externalUrl: "https://mabrik.ee/toode/test-game",
                    name: "Test Game",
                    imageUrl: "https://mabrik.ee/images/test-game.jpg",
                    currentPrice: "29.99",
                    inStock: true,
                },
            ],
        });

        const snapshots = await prisma.productSnapshot.findMany();

        expect(result.newProducts).toBe(0);
        expect(result.priceChanges).toBe(0);
        expect(snapshots).toHaveLength(1);
    });

    it("creates a new snapshot and counts a price change when the price changes", async () => {
        const category = await createCategory();
        const firstRun = await prisma.scrapeRun.create({
            data: {
                categoryId: category.id,
                status: "RUNNING",
            },
        });

        await persistScrapeResults({
            scrapeRunId: firstRun.id,
            categoryId: category.id,
            categorySlug: category.slug,
            pagesScraped: 1,
            parserWarnings: [],
            products: [
                {
                    externalUrl: "https://mabrik.ee/toode/test-game",
                    name: "Test Game",
                    imageUrl: "https://mabrik.ee/images/test-game.jpg",
                    currentPrice: "29.99",
                    inStock: true,
                },
            ],
        });

        const secondRun = await prisma.scrapeRun.create({
            data: {
                categoryId: category.id,
                status: "RUNNING",
            },
        });

        const result = await persistScrapeResults({
            scrapeRunId: secondRun.id,
            categoryId: category.id,
            categorySlug: category.slug,
            pagesScraped: 1,
            parserWarnings: [],
            products: [
                {
                    externalUrl: "https://mabrik.ee/toode/test-game",
                    name: "Test Game",
                    imageUrl: "https://mabrik.ee/images/test-game.jpg",
                    currentPrice: "24.99",
                    inStock: true,
                },
            ],
        });

        const snapshots = await prisma.productSnapshot.findMany({
            orderBy: { scrapedAt: "asc" },
        });

        expect(result.newProducts).toBe(0);
        expect(result.priceChanges).toBe(1);
        expect(snapshots).toHaveLength(2);
        expect(snapshots[1]?.price.toString()).toBe("24.99");
    });

    it("recalculates preorder flags on every scrape snapshot and clears stale flags", async () => {
        const category = await createCategory();
        const firstRun = await prisma.scrapeRun.create({
            data: {
                categoryId: category.id,
                status: "RUNNING",
            },
        });

        await persistScrapeResults({
            scrapeRunId: firstRun.id,
            categoryId: category.id,
            categorySlug: "eeltellimused",
            pagesScraped: 1,
            parserWarnings: [],
            products: [
                {
                    externalUrl: "https://mabrik.ee/toode/preorder-item",
                    name: "Preorder Item",
                    imageUrl: "https://mabrik.ee/images/preorder-item.jpg",
                    currentPrice: "49.99",
                    inStock: false,
                },
            ],
        });

        const created = await prisma.product.findUniqueOrThrow({
            where: { externalUrl: "https://mabrik.ee/toode/preorder-item" },
        });
        expect(created.isPreorder).toBe(true);
        expect(created.preorderDetectedFrom).toBe("CATEGORY_SLUG");

        const secondRun = await prisma.scrapeRun.create({
            data: {
                categoryId: category.id,
                status: "RUNNING",
            },
        });

        await persistScrapeResults({
            scrapeRunId: secondRun.id,
            categoryId: category.id,
            categorySlug: "lauamangud",
            pagesScraped: 1,
            parserWarnings: [],
            products: [
                {
                    externalUrl: "https://mabrik.ee/toode/preorder-item",
                    name: "Regular Item",
                    imageUrl: "https://mabrik.ee/images/preorder-item.jpg",
                    currentPrice: "49.99",
                    inStock: true,
                },
            ],
        });

        const updated = await prisma.product.findUniqueOrThrow({
            where: { externalUrl: "https://mabrik.ee/toode/preorder-item" },
        });
        expect(updated.isPreorder).toBe(false);
        expect(updated.preorderEta).toBeNull();
        expect(updated.preorderDetectedFrom).toBeNull();
    });
});
