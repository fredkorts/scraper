import request from "supertest";
import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { authCookieNames } from "../lib/cookies";
import { signAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";

useTestDatabase();

const authCookie = (userId: string, email: string, role: "free" | "paid" | "admin" = "free") => {
    const token = signAccessToken({
        sub: userId,
        email,
        role,
    });

    return `${authCookieNames.accessToken}=${token}`;
};

const createCategory = async (slug: string, nameEt: string) =>
    prisma.category.create({
        data: {
            slug,
            nameEt,
            nameEn: `${nameEt} EN`,
        },
    });

const subscribeToCategory = async (userId: string, categoryId: string) =>
    prisma.userSubscription.create({
        data: {
            userId,
            categoryId,
        },
    });

const createProduct = async (suffix: string, currentPrice = "39.99", name?: string) =>
    prisma.product.create({
        data: {
            externalUrl: `https://mabrik.ee/toode/${suffix}`,
            name: name ?? `Product ${suffix}`,
            imageUrl: `https://mabrik.ee/images/${suffix}.jpg`,
            currentPrice,
            originalPrice: null,
            inStock: true,
        },
    });

describe("categories and products routes", () => {
    it("rejects unauthenticated category and product requests", async () => {
        const app = createApp();
        const categoryResponse = await request(app).get("/api/categories");
        const productResponse = await request(app).get("/api/products/11111111-1111-4111-8111-111111111111");
        const searchResponse = await request(app).get("/api/products/search?query=magic");

        expect(categoryResponse.status).toBe(401);
        expect(productResponse.status).toBe(401);
        expect(searchResponse.status).toBe(401);
    });

    it("lists only tracked categories for non-admin users", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "categories@example.com" });
        const visibleCategory = await createCategory("visible-category", "Visible Category");
        await createCategory("hidden-category", "Hidden Category");

        await subscribeToCategory(user.id, visibleCategory.id);

        const response = await request(app).get("/api/categories").set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.categories).toHaveLength(1);
        expect(response.body.categories[0].id).toBe(visibleCategory.id);
    }, 15_000);

    it("allows admin users to list all active categories", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "categories-admin@example.com",
            role: UserRole.ADMIN,
        });

        const categoryA = await createCategory("admin-category-a", "Admin Category A");
        const categoryB = await createCategory("admin-category-b", "Admin Category B");

        const response = await request(app)
            .get("/api/categories")
            .set("Cookie", authCookie(user.id, user.email, "admin"));

        expect(response.status).toBe(200);
        expect(response.body.categories.map((category: { id: string }) => category.id)).toEqual([
            categoryA.id,
            categoryB.id,
        ]);
    });

    it("scopes product detail and history to the authenticated user's tracked categories", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "product-scope@example.com" });
        const visibleCategory = await createCategory("product-visible", "Product Visible");
        const hiddenCategory = await createCategory("product-hidden", "Product Hidden");

        await subscribeToCategory(user.id, visibleCategory.id);

        const visibleRun = await prisma.scrapeRun.create({
            data: {
                categoryId: visibleCategory.id,
                status: "COMPLETED",
                totalProducts: 1,
                pagesScraped: 1,
                startedAt: new Date("2026-03-01T10:00:00.000Z"),
                completedAt: new Date("2026-03-01T10:03:00.000Z"),
            },
        });

        const hiddenRun = await prisma.scrapeRun.create({
            data: {
                categoryId: hiddenCategory.id,
                status: "COMPLETED",
                totalProducts: 1,
                pagesScraped: 1,
                startedAt: new Date("2026-03-02T10:00:00.000Z"),
                completedAt: new Date("2026-03-02T10:03:00.000Z"),
            },
        });

        const scopedProduct = await createProduct("scoped-product", "99.99");
        await prisma.productCategory.createMany({
            data: [
                {
                    productId: scopedProduct.id,
                    categoryId: visibleCategory.id,
                },
                {
                    productId: scopedProduct.id,
                    categoryId: hiddenCategory.id,
                },
            ],
        });

        await prisma.productSnapshot.createMany({
            data: [
                {
                    scrapeRunId: visibleRun.id,
                    productId: scopedProduct.id,
                    name: scopedProduct.name,
                    price: "21.99",
                    originalPrice: null,
                    inStock: true,
                    imageUrl: scopedProduct.imageUrl,
                    scrapedAt: new Date("2026-03-01T10:02:00.000Z"),
                },
                {
                    scrapeRunId: hiddenRun.id,
                    productId: scopedProduct.id,
                    name: scopedProduct.name,
                    price: "9.99",
                    originalPrice: null,
                    inStock: false,
                    imageUrl: scopedProduct.imageUrl,
                    scrapedAt: new Date("2026-03-02T10:02:00.000Z"),
                },
            ],
        });

        const detailResponse = await request(app)
            .get(`/api/products/${scopedProduct.id}`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(detailResponse.status).toBe(200);
        expect(detailResponse.body.product.currentPrice).toBe(21.99);
        expect(detailResponse.body.product.inStock).toBe(true);
        expect(detailResponse.body.product.historyPointCount).toBe(1);
        expect(detailResponse.body.product.categories).toHaveLength(1);
        expect(detailResponse.body.product.categories[0].id).toBe(visibleCategory.id);
        expect(detailResponse.body.product.recentRuns).toHaveLength(1);
        expect(detailResponse.body.product.recentRuns[0].id).toBe(visibleRun.id);

        const historyResponse = await request(app)
            .get(`/api/products/${scopedProduct.id}/history`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(historyResponse.status).toBe(200);
        expect(historyResponse.body.items).toHaveLength(1);
        expect(historyResponse.body.items[0].scrapeRunId).toBe(visibleRun.id);
        expect(historyResponse.body.items[0].categoryId).toBe(visibleCategory.id);
    });

    it("returns 404 for inaccessible products", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "hidden-product@example.com" });
        const hiddenCategory = await createCategory("hidden-product-category", "Hidden Product Category");
        const hiddenProduct = await createProduct("hidden-product");

        await prisma.productCategory.create({
            data: {
                productId: hiddenProduct.id,
                categoryId: hiddenCategory.id,
            },
        });

        const response = await request(app)
            .get(`/api/products/${hiddenProduct.id}`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("not_found");
    });

    it("hides system-noise product history by default and allows admin opt-in", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "product-noise-admin@example.com", role: UserRole.ADMIN });
        const category = await createCategory("product-noise", "Product Noise");
        const product = await createProduct("product-noise");

        await prisma.productCategory.create({
            data: {
                productId: product.id,
                categoryId: category.id,
            },
        });

        const normalRun = await prisma.scrapeRun.create({
            data: {
                categoryId: category.id,
                status: "COMPLETED",
                pagesScraped: 1,
                startedAt: new Date("2026-03-01T10:00:00.000Z"),
                completedAt: new Date("2026-03-01T10:03:00.000Z"),
            },
        });
        const noisyRun = await prisma.scrapeRun.create({
            data: {
                categoryId: category.id,
                status: "COMPLETED",
                pagesScraped: 1,
                startedAt: new Date("2026-03-02T10:00:00.000Z"),
                completedAt: new Date("2026-03-02T10:03:00.000Z"),
                isSystemNoise: true,
                systemNoiseReason: "parser_false_drop_incident",
            },
        });

        await prisma.productSnapshot.createMany({
            data: [
                {
                    scrapeRunId: normalRun.id,
                    productId: product.id,
                    name: product.name,
                    price: "39.99",
                    originalPrice: null,
                    inStock: true,
                    imageUrl: product.imageUrl,
                    scrapedAt: new Date("2026-03-01T10:02:00.000Z"),
                },
                {
                    scrapeRunId: noisyRun.id,
                    productId: product.id,
                    name: product.name,
                    price: "29.99",
                    originalPrice: null,
                    inStock: false,
                    imageUrl: product.imageUrl,
                    scrapedAt: new Date("2026-03-02T10:02:00.000Z"),
                },
            ],
        });

        const detailDefault = await request(app)
            .get(`/api/products/${product.id}`)
            .set("Cookie", authCookie(user.id, user.email, "admin"));
        const detailIncluded = await request(app)
            .get(`/api/products/${product.id}?includeSystemNoise=true`)
            .set("Cookie", authCookie(user.id, user.email, "admin"));
        const historyIncluded = await request(app)
            .get(`/api/products/${product.id}/history?includeSystemNoise=true`)
            .set("Cookie", authCookie(user.id, user.email, "admin"));

        expect(detailDefault.status).toBe(200);
        expect(detailDefault.body.product.currentPrice).toBe(39.99);
        expect(detailIncluded.status).toBe(200);
        expect(detailIncluded.body.product.currentPrice).toBe(29.99);
        expect(historyIncluded.status).toBe(200);
        expect(historyIncluded.body.items).toHaveLength(2);
    });

    it("rejects includeSystemNoise on product endpoints for non-admin users", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "product-noise-user@example.com" });
        const category = await createCategory("product-noise-user", "Product Noise User");
        const product = await createProduct("product-noise-user");

        await subscribeToCategory(user.id, category.id);
        await prisma.productCategory.create({
            data: {
                productId: product.id,
                categoryId: category.id,
            },
        });

        const response = await request(app)
            .get(`/api/products/${product.id}?includeSystemNoise=true`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(403);
        expect(response.body.error).toBe("forbidden");
    });

    it("searches products within accessible scope and matches category text", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "product-search-scope@example.com" });
        const visibleCategory = await createCategory("mtg-visible", "Magic Decks");
        const hiddenCategory = await createCategory("pokemon-hidden", "Pokemon");
        const visibleProduct = await createProduct("deck-one", "39.99", "Arcane Box");
        const hiddenProduct = await createProduct("deck-two", "39.99", "Hidden Product");

        await subscribeToCategory(user.id, visibleCategory.id);

        await prisma.productCategory.createMany({
            data: [
                {
                    productId: visibleProduct.id,
                    categoryId: visibleCategory.id,
                },
                {
                    productId: hiddenProduct.id,
                    categoryId: hiddenCategory.id,
                },
            ],
        });

        const response = await request(app)
            .get("/api/products/search?query=magic&limit=8")
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0]).toMatchObject({
            id: visibleProduct.id,
            name: "Arcane Box",
            categoryName: "Magic Decks",
        });
    });

    it("returns deterministic category labels for multi-category products", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "product-search-categories@example.com", role: UserRole.ADMIN });
        const alphaCategory = await createCategory("alpha-category", "Alpha Category");
        const omegaCategory = await createCategory("omega-category", "Omega Category");
        const product = await createProduct("multi-category", "39.99", "Rune Box");

        await prisma.productCategory.createMany({
            data: [
                {
                    productId: product.id,
                    categoryId: omegaCategory.id,
                },
                {
                    productId: product.id,
                    categoryId: alphaCategory.id,
                },
            ],
        });

        const response = await request(app)
            .get("/api/products/search?query=category")
            .set("Cookie", authCookie(user.id, user.email, "admin"));

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0]).toMatchObject({
            id: product.id,
            categoryName: "Alpha Category",
        });
    });

    it("returns no-store cache headers and validates search query shape", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "product-search-cache@example.com" });
        const category = await createCategory("cache-category", "Cache Category");
        const product = await createProduct("cache-product", "39.99", "Cache Product");

        await subscribeToCategory(user.id, category.id);
        await prisma.productCategory.create({
            data: {
                productId: product.id,
                categoryId: category.id,
            },
        });

        const okResponse = await request(app)
            .get("/api/products/search?query=cache")
            .set("Cookie", authCookie(user.id, user.email));

        expect(okResponse.status).toBe(200);
        expect(okResponse.headers["cache-control"]).toContain("private");
        expect(okResponse.headers["cache-control"]).toContain("no-store");

        const invalidResponse = await request(app)
            .get("/api/products/search?query=a")
            .set("Cookie", authCookie(user.id, user.email));

        expect(invalidResponse.status).toBe(400);
        expect(invalidResponse.body.error).toBe("validation_error");
    });
});
