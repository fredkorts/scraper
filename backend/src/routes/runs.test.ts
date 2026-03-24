import request from "supertest";
import { ChangeType as PrismaChangeType, ScrapeRunStatus, UserRole } from "@prisma/client";
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

const createCategory = async (slug: string, nameEt: string, parentId?: string) =>
    prisma.category.create({
        data: {
            slug,
            nameEt,
            nameEn: `${nameEt} EN`,
            parentId,
        },
    });

const subscribeToCategory = async (userId: string, categoryId: string) =>
    prisma.userSubscription.create({
        data: {
            userId,
            categoryId,
        },
    });

const createRun = async (
    categoryId: string,
    overrides: Partial<{
        id: string;
        status: ScrapeRunStatus;
        totalProducts: number;
        newProducts: number;
        priceChanges: number;
        soldOut: number;
        backInStock: number;
        pagesScraped: number;
        durationMs: number;
        errorMessage: string;
        failureCode: string;
        failurePhase: string;
        failurePageUrl: string;
        failurePageNumber: number;
        failureIsRetryable: boolean;
        failureTechnicalMessage: string;
        failureSummary: string;
        startedAt: Date;
        completedAt: Date;
        isSystemNoise: boolean;
        systemNoiseReason: string | null;
    }> = {},
) =>
    prisma.scrapeRun.create({
        data: {
            ...(overrides.id ? { id: overrides.id } : {}),
            categoryId,
            status: overrides.status ?? ScrapeRunStatus.COMPLETED,
            totalProducts: overrides.totalProducts ?? 0,
            newProducts: overrides.newProducts ?? 0,
            priceChanges: overrides.priceChanges ?? 0,
            soldOut: overrides.soldOut ?? 0,
            backInStock: overrides.backInStock ?? 0,
            pagesScraped: overrides.pagesScraped ?? 1,
            durationMs: overrides.durationMs,
            errorMessage: overrides.errorMessage,
            failureCode: overrides.failureCode,
            failurePhase: overrides.failurePhase,
            failurePageUrl: overrides.failurePageUrl,
            failurePageNumber: overrides.failurePageNumber,
            failureIsRetryable: overrides.failureIsRetryable,
            failureTechnicalMessage: overrides.failureTechnicalMessage,
            failureSummary: overrides.failureSummary,
            startedAt: overrides.startedAt ?? new Date(),
            completedAt: overrides.completedAt,
            isSystemNoise: overrides.isSystemNoise ?? false,
            systemNoiseReason: overrides.systemNoiseReason === undefined ? null : overrides.systemNoiseReason,
        },
    });

const createProduct = async (
    suffix: string,
    overrides: Partial<{
        name: string;
        currentPrice: string;
        originalPrice: string | null;
        inStock: boolean;
        isPreorder: boolean;
        preorderEta: Date | null;
        preorderDetectedFrom: "CATEGORY_SLUG" | "TITLE" | "DESCRIPTION" | null;
    }> = {},
) =>
    prisma.product.create({
        data: {
            externalUrl: `https://mabrik.ee/toode/${suffix}`,
            name: overrides.name ?? `Product ${suffix}`,
            imageUrl: `https://mabrik.ee/images/${suffix}.jpg`,
            currentPrice: overrides.currentPrice ?? "19.99",
            originalPrice: overrides.originalPrice === undefined ? null : overrides.originalPrice,
            inStock: overrides.inStock ?? true,
            isPreorder: overrides.isPreorder ?? false,
            preorderEta: overrides.preorderEta === undefined ? null : overrides.preorderEta,
            preorderDetectedFrom: overrides.preorderDetectedFrom === undefined ? null : overrides.preorderDetectedFrom,
        },
    });

describe("dashboard and runs routes", () => {
    it("rejects unauthenticated requests", async () => {
        const app = createApp();

        const dashboardResponse = await request(app).get("/api/dashboard/home");
        const runsResponse = await request(app).get("/api/runs");
        const changesResponse = await request(app).get("/api/changes");

        expect(dashboardResponse.status).toBe(401);
        expect(runsResponse.status).toBe(401);
        expect(changesResponse.status).toBe(401);
    });

    it("returns dashboard data scoped to the authenticated user's tracked categories", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "viewer@example.com" });
        const categoryA = await createCategory("board-games", "Board Games");
        const categoryB = await createCategory("miniatures", "Miniatures");

        await subscribeToCategory(user.id, categoryA.id);

        const scopedCompletedRun = await createRun(categoryA.id, {
            totalProducts: 12,
            priceChanges: 1,
            soldOut: 1,
            durationMs: 3200,
        });
        const scopedFailedRun = await createRun(categoryA.id, {
            status: ScrapeRunStatus.FAILED,
            errorMessage: "The scrape timed out while loading page 31.",
            failureCode: "upstream_timeout",
            failurePhase: "fetch",
            failurePageUrl: "https://mabrik.ee/tootekategooria/board-games/page/31/",
            failurePageNumber: 31,
            failureIsRetryable: true,
            failureTechnicalMessage: "timeout of 45000ms exceeded",
            failureSummary: "The scrape timed out while loading page 31.",
        });
        const hiddenRun = await createRun(categoryB.id, {
            totalProducts: 50,
            priceChanges: 2,
        });

        const scopedReport = await prisma.changeReport.create({
            data: {
                scrapeRunId: scopedCompletedRun.id,
                totalChanges: 2,
            },
        });

        const hiddenReport = await prisma.changeReport.create({
            data: {
                scrapeRunId: hiddenRun.id,
                totalChanges: 1,
            },
        });

        const scopedProduct = await createProduct("scoped");
        const hiddenProduct = await createProduct("hidden");

        await prisma.productCategory.createMany({
            data: [
                {
                    productId: scopedProduct.id,
                    categoryId: categoryA.id,
                },
                {
                    productId: hiddenProduct.id,
                    categoryId: categoryB.id,
                },
            ],
        });

        await prisma.userTrackedProduct.createMany({
            data: [
                {
                    userId: user.id,
                    productId: scopedProduct.id,
                    isActive: true,
                },
                {
                    userId: user.id,
                    productId: hiddenProduct.id,
                    isActive: true,
                },
            ],
        });

        await prisma.changeItem.createMany({
            data: [
                {
                    changeReportId: scopedReport.id,
                    productId: scopedProduct.id,
                    changeType: PrismaChangeType.PRICE_DECREASE,
                    oldPrice: "24.99",
                    newPrice: "19.99",
                },
                {
                    changeReportId: scopedReport.id,
                    productId: scopedProduct.id,
                    changeType: PrismaChangeType.SOLD_OUT,
                    oldStockStatus: true,
                    newStockStatus: false,
                },
                {
                    changeReportId: hiddenReport.id,
                    productId: hiddenProduct.id,
                    changeType: PrismaChangeType.NEW_PRODUCT,
                },
            ],
        });

        const response = await request(app).get("/api/dashboard/home").set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.headers["cache-control"]).toBe("private, no-store");
        expect(response.body.latestRuns).toHaveLength(2);
        expect(response.body.latestRuns.every((run: { categoryId: string }) => run.categoryId === categoryA.id)).toBe(
            true,
        );
        expect(response.body.recentFailures).toHaveLength(1);
        expect(response.body.recentFailures[0].failure).toEqual({
            summary: "The scrape timed out while loading page 31.",
            code: "upstream_timeout",
            phase: "fetch",
            pageUrl: "https://mabrik.ee/tootekategooria/board-games/page/31/",
            pageNumber: 31,
            isRetryable: true,
        });
        expect(response.body.recentChangeSummary).toEqual({
            priceIncrease: 0,
            priceDecrease: 1,
            newProduct: 0,
            soldOut: 1,
            backInStock: 0,
        });

        const hiddenRunPresent = response.body.latestRuns.some((run: { id: string }) => run.id === hiddenRun.id);
        expect(hiddenRunPresent).toBe(false);
        expect(response.body.recentFailures[0].id).toBe(scopedFailedRun.id);
        expect(response.body.trackingOverview.rows).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: "category",
                    categoryId: categoryA.id,
                }),
                expect.objectContaining({
                    type: "product",
                    productId: scopedProduct.id,
                }),
            ]),
        );
        expect(
            response.body.trackingOverview.rows.some(
                (row: { productId?: string }) => row.productId === hiddenProduct.id,
            ),
        ).toBe(false);
    });

    it("applies the dashboard category filter within the user's allowed scope", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "dashboard-filter@example.com" });
        const categoryA = await createCategory("filter-a", "Filter A");
        const categoryB = await createCategory("filter-b", "Filter B");

        await subscribeToCategory(user.id, categoryA.id);
        await subscribeToCategory(user.id, categoryB.id);

        const runA = await createRun(categoryA.id, { totalProducts: 3 });
        const runB = await createRun(categoryB.id, { totalProducts: 7 });

        await prisma.changeReport.createMany({
            data: [
                {
                    scrapeRunId: runA.id,
                    totalChanges: 1,
                },
                {
                    scrapeRunId: runB.id,
                    totalChanges: 2,
                },
            ],
        });

        const response = await request(app)
            .get(`/api/dashboard/home?categoryId=${categoryB.id}`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.latestRuns).toHaveLength(1);
        expect(response.body.latestRuns[0].categoryId).toBe(categoryB.id);
        expect(response.body.latestRuns[0].id).toBe(runB.id);
    });

    it("includes descendant category runs when filtering dashboard by a parent category", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "dashboard-parent-filter@example.com" });
        const parentCategory = await createCategory("comics/marvel", "Marvel Comics");
        const childCategory = await createCategory("comics/marvel/deadpool", "Deadpool", parentCategory.id);
        const siblingCategory = await createCategory("comics/dc", "DC Comics");

        await subscribeToCategory(user.id, parentCategory.id);
        await subscribeToCategory(user.id, childCategory.id);
        await subscribeToCategory(user.id, siblingCategory.id);

        const parentRun = await createRun(parentCategory.id, { totalProducts: 3 });
        const childRun = await createRun(childCategory.id, { totalProducts: 9 });
        const siblingRun = await createRun(siblingCategory.id, { totalProducts: 15 });

        await prisma.changeReport.createMany({
            data: [
                { scrapeRunId: parentRun.id, totalChanges: 1 },
                { scrapeRunId: childRun.id, totalChanges: 2 },
                { scrapeRunId: siblingRun.id, totalChanges: 4 },
            ],
        });

        const response = await request(app)
            .get(`/api/dashboard/home?categoryId=${parentCategory.id}`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.latestRuns).toHaveLength(2);
        expect(response.body.latestRuns.map((run: { categoryId: string }) => run.categoryId)).toEqual(
            expect.arrayContaining([parentCategory.id, childCategory.id]),
        );
        expect(
            response.body.latestRuns.some((run: { categoryId: string }) => run.categoryId === siblingCategory.id),
        ).toBe(false);
    });

    it("includes descendant category runs when filtering runs list by a parent category", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "runs-parent-filter@example.com" });
        const parentCategory = await createCategory("books/marvel", "Marvel Books");
        const childCategory = await createCategory("books/marvel/deadpool", "Deadpool Books", parentCategory.id);
        const siblingCategory = await createCategory("books/dc", "DC Books");

        await subscribeToCategory(user.id, parentCategory.id);
        await subscribeToCategory(user.id, childCategory.id);
        await subscribeToCategory(user.id, siblingCategory.id);

        await createRun(parentCategory.id, { totalProducts: 1 });
        const childRun = await createRun(childCategory.id, { totalProducts: 2 });
        await createRun(siblingCategory.id, { totalProducts: 3 });

        const response = await request(app)
            .get(`/api/runs?page=1&pageSize=10&categoryId=${parentCategory.id}`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.totalItems).toBe(2);
        expect(response.body.items.map((item: { categoryId: string }) => item.categoryId)).toEqual(
            expect.arrayContaining([parentCategory.id, childCategory.id]),
        );
        expect(response.body.items.some((item: { categoryId: string }) => item.categoryId === siblingCategory.id)).toBe(
            false,
        );
        expect(response.body.items.some((item: { id: string }) => item.id === childRun.id)).toBe(true);
    });

    it("lists only runs for subscribed categories for non-admin users", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "scoped-list@example.com" });
        const categoryA = await createCategory("card-games", "Card Games");
        const categoryB = await createCategory("rpgs", "Role-Playing Games");

        await subscribeToCategory(user.id, categoryA.id);

        const visibleRun = await createRun(categoryA.id, { totalProducts: 10 });
        await prisma.changeReport.create({
            data: {
                scrapeRunId: visibleRun.id,
                totalChanges: 3,
            },
        });

        await createRun(categoryB.id, { totalProducts: 99 });

        const response = await request(app)
            .get("/api/runs?page=1&pageSize=10")
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.totalItems).toBe(1);
        expect(response.body.items[0].id).toBe(visibleRun.id);
        expect(response.body.items[0].totalChanges).toBe(3);
    });

    it("allows admin users to see runs across all categories", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "admin@example.com",
            role: UserRole.ADMIN,
        });
        const categoryA = await createCategory("admin-a", "Admin A");
        const categoryB = await createCategory("admin-b", "Admin B");

        await createRun(categoryA.id);
        await createRun(categoryB.id);

        const response = await request(app)
            .get("/api/runs?page=1&pageSize=10")
            .set("Cookie", authCookie(user.id, user.email, "admin"));

        expect(response.status).toBe(200);
        expect(response.body.totalItems).toBe(2);
        expect(response.body.items).toHaveLength(2);
    });

    it("uses deterministic secondary ordering for runs list ties", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "ordering@example.com" });
        const category = await createCategory("ordering-category", "Ordering Category");
        const sharedStartedAt = new Date("2026-03-01T10:00:00.000Z");

        await subscribeToCategory(user.id, category.id);
        await createRun(category.id, {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            startedAt: sharedStartedAt,
        });
        await createRun(category.id, {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            startedAt: sharedStartedAt,
        });

        const response = await request(app)
            .get("/api/runs?page=1&pageSize=10&sortBy=startedAt&sortOrder=desc")
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(2);
        expect(response.body.items.map((item: { id: string }) => item.id)).toEqual([
            "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        ]);
    });

    it("validates runs list query params", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "validation@example.com" });

        const response = await request(app)
            .get("/api/runs?sortBy=drop_table&page=0")
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("validation_error");
    });

    it("rejects runs list requests that exceed pagination page limits", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "validation-page-limit@example.com" });

        const response = await request(app)
            .get("/api/runs?page=501&pageSize=25")
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("validation_error");
    });

    it("returns 404 for inaccessible run detail requests", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "inaccessible@example.com" });
        const categoryA = await createCategory("accessible", "Accessible");
        const categoryB = await createCategory("hidden-category", "Hidden");

        await subscribeToCategory(user.id, categoryA.id);
        const hiddenRun = await createRun(categoryB.id);

        const response = await request(app)
            .get(`/api/runs/${hiddenRun.id}`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("not_found");
    });

    it("returns readable failure metadata for non-admin run detail requests without technical detail", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "failure-detail@example.com" });
        const category = await createCategory("failure-detail", "Failure Detail");

        await subscribeToCategory(user.id, category.id);
        const run = await createRun(category.id, {
            status: ScrapeRunStatus.FAILED,
            errorMessage: "The scrape timed out while loading page 31.",
            failureCode: "upstream_timeout",
            failurePhase: "fetch",
            failurePageUrl: "https://mabrik.ee/tootekategooria/failure-detail/page/31/",
            failurePageNumber: 31,
            failureIsRetryable: true,
            failureTechnicalMessage: "timeout of 45000ms exceeded",
            failureSummary: "The scrape timed out while loading page 31.",
        });

        const response = await request(app).get(`/api/runs/${run.id}`).set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.run.failure).toEqual({
            summary: "The scrape timed out while loading page 31.",
            code: "upstream_timeout",
            phase: "fetch",
            pageUrl: "https://mabrik.ee/tootekategooria/failure-detail/page/31/",
            pageNumber: 31,
            isRetryable: true,
        });
        expect(response.body.run.failure.technicalMessage).toBeUndefined();
    });

    it("returns sanitized technical failure detail for admin run detail requests", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "failure-admin@example.com",
            role: UserRole.ADMIN,
        });
        const category = await createCategory("failure-admin", "Failure Admin");
        const run = await createRun(category.id, {
            status: ScrapeRunStatus.FAILED,
            errorMessage: "The scrape timed out while loading page 31.",
            failureCode: "upstream_timeout",
            failurePhase: "fetch",
            failurePageUrl: "https://mabrik.ee/tootekategooria/failure-admin/page/31/",
            failurePageNumber: 31,
            failureIsRetryable: true,
            failureTechnicalMessage: "timeout of 45000ms exceeded",
            failureSummary: "The scrape timed out while loading page 31.",
        });

        const response = await request(app)
            .get(`/api/runs/${run.id}`)
            .set("Cookie", authCookie(user.id, user.email, "admin"));

        expect(response.status).toBe(200);
        expect(response.body.run.failure.technicalMessage).toBe("timeout of 45000ms exceeded");
    });

    it("lists run products with pagination and stock filtering", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "products@example.com" });
        const category = await createCategory("run-products", "Run Products");

        await subscribeToCategory(user.id, category.id);
        const run = await createRun(category.id, { totalProducts: 2 });

        const inStockProduct = await createProduct("in-stock", { inStock: true });
        const soldOutProduct = await createProduct("sold-out", { inStock: false });

        await prisma.productSnapshot.createMany({
            data: [
                {
                    scrapeRunId: run.id,
                    productId: inStockProduct.id,
                    name: inStockProduct.name,
                    price: "11.99",
                    originalPrice: null,
                    inStock: true,
                    imageUrl: inStockProduct.imageUrl,
                },
                {
                    scrapeRunId: run.id,
                    productId: soldOutProduct.id,
                    name: soldOutProduct.name,
                    price: "17.99",
                    originalPrice: "21.99",
                    inStock: false,
                    imageUrl: soldOutProduct.imageUrl,
                },
            ],
        });

        const response = await request(app)
            .get(`/api/runs/${run.id}/products?page=1&pageSize=1&inStock=true`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.totalItems).toBe(1);
        expect(response.body.totalPages).toBe(1);
        expect(response.body.items[0].productId).toBe(inStockProduct.id);
        expect(response.body.items[0].externalUrl).toBe(inStockProduct.externalUrl);
    });

    it("filters run products by search query across product name and URL", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "products-search@example.com" });
        const category = await createCategory("run-products-search", "Run Products Search");

        await subscribeToCategory(user.id, category.id);
        const run = await createRun(category.id, { totalProducts: 2 });

        const deadpoolProduct = await createProduct("deadpool-deck", { name: "Deadpool Deck Box" });
        const pokemonProduct = await createProduct("pokemon-sleeves", { name: "Pokemon Sleeves" });

        await prisma.productSnapshot.createMany({
            data: [
                {
                    scrapeRunId: run.id,
                    productId: deadpoolProduct.id,
                    name: deadpoolProduct.name,
                    price: "11.99",
                    originalPrice: null,
                    inStock: true,
                    imageUrl: deadpoolProduct.imageUrl,
                },
                {
                    scrapeRunId: run.id,
                    productId: pokemonProduct.id,
                    name: pokemonProduct.name,
                    price: "17.99",
                    originalPrice: null,
                    inStock: true,
                    imageUrl: pokemonProduct.imageUrl,
                },
            ],
        });

        const response = await request(app)
            .get(`/api/runs/${run.id}/products?page=1&pageSize=10&query=deadpool`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.totalItems).toBe(1);
        expect(response.body.items[0].productId).toBe(deadpoolProduct.id);
    });

    it("rejects run products requests that exceed pagination page limits", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "products-pagination-limit@example.com" });
        const category = await createCategory("run-products-limit", "Run Products Limit");

        await subscribeToCategory(user.id, category.id);
        const run = await createRun(category.id, { totalProducts: 0 });

        const response = await request(app)
            .get(`/api/runs/${run.id}/products?page=501&pageSize=100`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("validation_error");
    });

    it("lists run changes with change-type filtering", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "changes@example.com" });
        const category = await createCategory("run-changes", "Run Changes");

        await subscribeToCategory(user.id, category.id);
        const run = await createRun(category.id, {
            totalProducts: 2,
            soldOut: 1,
            priceChanges: 1,
        });
        const report = await prisma.changeReport.create({
            data: {
                scrapeRunId: run.id,
                totalChanges: 2,
            },
        });

        const priceProduct = await createProduct("price-product");
        const soldOutProduct = await createProduct("sold-out-product");

        await prisma.changeItem.createMany({
            data: [
                {
                    changeReportId: report.id,
                    productId: priceProduct.id,
                    changeType: PrismaChangeType.PRICE_DECREASE,
                    oldPrice: "29.99",
                    newPrice: "19.99",
                },
                {
                    changeReportId: report.id,
                    productId: soldOutProduct.id,
                    changeType: PrismaChangeType.SOLD_OUT,
                    oldStockStatus: true,
                    newStockStatus: false,
                },
            ],
        });

        const response = await request(app)
            .get(`/api/runs/${run.id}/changes?page=1&pageSize=10&changeType=sold_out`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.totalItems).toBe(1);
        expect(response.body.items[0].changeType).toBe("sold_out");
        expect(response.body.items[0].product.id).toBe(soldOutProduct.id);
        expect(response.body.items[0].product.externalUrl).toBe(soldOutProduct.externalUrl);
        expect(response.body.items[0].oldStockStatus).toBe(true);
        expect(response.body.items[0].newStockStatus).toBe(false);
    });

    it("filters run changes by search query tokens", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "changes-search@example.com" });
        const category = await createCategory("run-changes-search", "Run Changes Search");

        await subscribeToCategory(user.id, category.id);
        const run = await createRun(category.id, { totalProducts: 2, soldOut: 1, priceChanges: 1 });
        const report = await prisma.changeReport.create({
            data: {
                scrapeRunId: run.id,
                totalChanges: 2,
            },
        });

        const priceProduct = await createProduct("changes-search-price", { name: "Price Product" });
        const soldOutProduct = await createProduct("changes-search-stock", { name: "Stock Product" });

        await prisma.changeItem.createMany({
            data: [
                {
                    changeReportId: report.id,
                    productId: priceProduct.id,
                    changeType: PrismaChangeType.PRICE_DECREASE,
                    oldPrice: "29.99",
                    newPrice: "19.99",
                },
                {
                    changeReportId: report.id,
                    productId: soldOutProduct.id,
                    changeType: PrismaChangeType.SOLD_OUT,
                    oldStockStatus: true,
                    newStockStatus: false,
                },
            ],
        });

        const response = await request(app)
            .get(`/api/runs/${run.id}/changes?page=1&pageSize=10&query=sold%20out`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.totalItems).toBe(1);
        expect(response.body.items[0].changeType).toBe("sold_out");
        expect(response.body.items[0].product.id).toBe(soldOutProduct.id);
    });

    it("filters run changes by preorder state", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "changes-preorder@example.com" });
        const category = await createCategory("run-changes-preorder", "Run Changes Preorder");

        await subscribeToCategory(user.id, category.id);
        const run = await createRun(category.id, { totalProducts: 2 });
        const report = await prisma.changeReport.create({
            data: {
                scrapeRunId: run.id,
                totalChanges: 2,
            },
        });

        const preorderProduct = await createProduct("preorder-change-product", {
            isPreorder: true,
            preorderDetectedFrom: "CATEGORY_SLUG",
        });
        const regularProduct = await createProduct("regular-change-product", {
            isPreorder: false,
            preorderDetectedFrom: null,
        });

        await prisma.changeItem.createMany({
            data: [
                {
                    changeReportId: report.id,
                    productId: preorderProduct.id,
                    changeType: PrismaChangeType.NEW_PRODUCT,
                },
                {
                    changeReportId: report.id,
                    productId: regularProduct.id,
                    changeType: PrismaChangeType.NEW_PRODUCT,
                },
            ],
        });

        const response = await request(app)
            .get(`/api/runs/${run.id}/changes?page=1&pageSize=25&preorder=only`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.totalItems).toBe(1);
        expect(response.body.items[0].product.id).toBe(preorderProduct.id);
        expect(response.body.items[0].product.isPreorder).toBe(true);
    });

    it("lists scoped cross-run changes for accessible categories", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "global-changes@example.com" });
        const visibleCategory = await createCategory("changes-visible", "Changes Visible");
        const hiddenCategory = await createCategory("changes-hidden", "Changes Hidden");

        await subscribeToCategory(user.id, visibleCategory.id);

        const visibleRun = await createRun(visibleCategory.id, { totalProducts: 1 });
        const hiddenRun = await createRun(hiddenCategory.id, { totalProducts: 1 });
        const visibleReport = await prisma.changeReport.create({
            data: {
                scrapeRunId: visibleRun.id,
                totalChanges: 1,
            },
        });
        const hiddenReport = await prisma.changeReport.create({
            data: {
                scrapeRunId: hiddenRun.id,
                totalChanges: 1,
            },
        });

        const visibleProduct = await createProduct("changes-visible-product");
        const hiddenProduct = await createProduct("changes-hidden-product");

        await prisma.changeItem.createMany({
            data: [
                {
                    changeReportId: visibleReport.id,
                    productId: visibleProduct.id,
                    changeType: PrismaChangeType.NEW_PRODUCT,
                },
                {
                    changeReportId: hiddenReport.id,
                    productId: hiddenProduct.id,
                    changeType: PrismaChangeType.NEW_PRODUCT,
                },
            ],
        });

        const response = await request(app)
            .get("/api/changes?page=1&pageSize=25&windowDays=30")
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.totalItems).toBe(1);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].category.id).toBe(visibleCategory.id);
        expect(response.body.items[0].run.id).toBe(visibleRun.id);
        expect(response.body.items[0].changedAt).toBeTruthy();
    });

    it("filters cross-run changes by search query", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "global-changes-search@example.com" });
        const category = await createCategory("global-search", "Global Search");
        await subscribeToCategory(user.id, category.id);

        const run = await createRun(category.id, { totalProducts: 2 });
        const report = await prisma.changeReport.create({
            data: {
                scrapeRunId: run.id,
                totalChanges: 2,
            },
        });

        const deadpoolProduct = await createProduct("global-search-deadpool", { name: "Deadpool Dice" });
        const pokemonProduct = await createProduct("global-search-pokemon", { name: "Pokemon Deck" });

        await prisma.changeItem.createMany({
            data: [
                {
                    changeReportId: report.id,
                    productId: deadpoolProduct.id,
                    changeType: PrismaChangeType.NEW_PRODUCT,
                },
                {
                    changeReportId: report.id,
                    productId: pokemonProduct.id,
                    changeType: PrismaChangeType.NEW_PRODUCT,
                },
            ],
        });

        const response = await request(app)
            .get("/api/changes?page=1&pageSize=25&windowDays=30&query=deadpool")
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.totalItems).toBe(1);
        expect(response.body.items[0].product.id).toBe(deadpoolProduct.id);
    });

    it("filters cross-run changes by multiple change types", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "global-changes-multi-type@example.com" });
        const category = await createCategory("global-multi-type", "Global Multi Type");
        await subscribeToCategory(user.id, category.id);

        const run = await createRun(category.id, { totalProducts: 3 });
        const report = await prisma.changeReport.create({
            data: {
                scrapeRunId: run.id,
                totalChanges: 3,
            },
        });

        const soldOutProduct = await createProduct("global-multi-sold-out", { name: "Sold Out Product" });
        const priceDropProduct = await createProduct("global-multi-price-drop", { name: "Price Drop Product" });
        const newProduct = await createProduct("global-multi-new", { name: "New Product" });

        await prisma.changeItem.createMany({
            data: [
                {
                    changeReportId: report.id,
                    productId: soldOutProduct.id,
                    changeType: PrismaChangeType.SOLD_OUT,
                    oldStockStatus: true,
                    newStockStatus: false,
                },
                {
                    changeReportId: report.id,
                    productId: priceDropProduct.id,
                    changeType: PrismaChangeType.PRICE_DECREASE,
                },
                {
                    changeReportId: report.id,
                    productId: newProduct.id,
                    changeType: PrismaChangeType.NEW_PRODUCT,
                },
            ],
        });

        const response = await request(app)
            .get("/api/changes?page=1&pageSize=25&windowDays=30&changeType=sold_out,price_decrease")
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.totalItems).toBe(2);
        expect(response.body.items).toHaveLength(2);
        expect(response.body.items.map((item: { changeType: string }) => item.changeType).sort()).toEqual([
            "price_decrease",
            "sold_out",
        ]);
    });

    it("filters cross-run changes by preorder state", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "global-changes-preorder@example.com" });
        const category = await createCategory("global-preorder", "Global Preorder");
        await subscribeToCategory(user.id, category.id);

        const run = await createRun(category.id, { totalProducts: 2 });
        const report = await prisma.changeReport.create({
            data: {
                scrapeRunId: run.id,
                totalChanges: 2,
            },
        });

        const preorderProduct = await createProduct("global-preorder-product", {
            isPreorder: true,
            preorderDetectedFrom: "TITLE",
        });
        const regularProduct = await createProduct("global-regular-product", {
            isPreorder: false,
            preorderDetectedFrom: null,
        });

        await prisma.changeItem.createMany({
            data: [
                {
                    changeReportId: report.id,
                    productId: preorderProduct.id,
                    changeType: PrismaChangeType.SOLD_OUT,
                    oldStockStatus: true,
                    newStockStatus: false,
                },
                {
                    changeReportId: report.id,
                    productId: regularProduct.id,
                    changeType: PrismaChangeType.SOLD_OUT,
                    oldStockStatus: true,
                    newStockStatus: false,
                },
            ],
        });

        const response = await request(app)
            .get("/api/changes?page=1&pageSize=25&windowDays=30&preorder=exclude")
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.totalItems).toBe(1);
        expect(response.body.items[0].product.id).toBe(regularProduct.id);
        expect(response.body.items[0].product.isPreorder).toBe(false);
    });

    it("includes descendant category changes when filtering global changes by a parent category", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "global-changes-parent@example.com" });
        const parentCategory = await createCategory("collectibles", "Collectibles");
        const childCategory = await createCategory("collectibles/figures", "Figures", parentCategory.id);
        const siblingCategory = await createCategory("books", "Books");

        await subscribeToCategory(user.id, parentCategory.id);
        await subscribeToCategory(user.id, childCategory.id);
        await subscribeToCategory(user.id, siblingCategory.id);

        const parentRun = await createRun(parentCategory.id);
        const childRun = await createRun(childCategory.id);
        const siblingRun = await createRun(siblingCategory.id);

        const [parentReport, childReport, siblingReport] = await Promise.all([
            prisma.changeReport.create({ data: { scrapeRunId: parentRun.id, totalChanges: 1 } }),
            prisma.changeReport.create({ data: { scrapeRunId: childRun.id, totalChanges: 1 } }),
            prisma.changeReport.create({ data: { scrapeRunId: siblingRun.id, totalChanges: 1 } }),
        ]);

        const [parentProduct, childProduct, siblingProduct] = await Promise.all([
            createProduct("global-parent-product"),
            createProduct("global-child-product"),
            createProduct("global-sibling-product"),
        ]);

        await prisma.changeItem.createMany({
            data: [
                {
                    changeReportId: parentReport.id,
                    productId: parentProduct.id,
                    changeType: PrismaChangeType.SOLD_OUT,
                    oldStockStatus: true,
                    newStockStatus: false,
                },
                {
                    changeReportId: childReport.id,
                    productId: childProduct.id,
                    changeType: PrismaChangeType.SOLD_OUT,
                    oldStockStatus: true,
                    newStockStatus: false,
                },
                {
                    changeReportId: siblingReport.id,
                    productId: siblingProduct.id,
                    changeType: PrismaChangeType.SOLD_OUT,
                    oldStockStatus: true,
                    newStockStatus: false,
                },
            ],
        });

        const response = await request(app)
            .get(`/api/changes?page=1&pageSize=25&categoryId=${parentCategory.id}&windowDays=30`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.totalItems).toBe(2);
        expect(response.body.items.map((item: { category: { id: string } }) => item.category.id)).toEqual(
            expect.arrayContaining([parentCategory.id, childCategory.id]),
        );
        expect(
            response.body.items.some((item: { category: { id: string } }) => item.category.id === siblingCategory.id),
        ).toBe(false);
    });

    it("excludes system-noise runs and change items by default", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "noise-filter-admin@example.com", role: UserRole.ADMIN });
        const category = await createCategory("noise-filter", "Noise Filter");

        const normalRun = await createRun(category.id, {
            startedAt: new Date("2026-03-03T10:00:00.000Z"),
            completedAt: new Date("2026-03-03T10:02:00.000Z"),
        });
        const noisyRun = await createRun(category.id, {
            startedAt: new Date("2026-03-03T11:00:00.000Z"),
            completedAt: new Date("2026-03-03T11:02:00.000Z"),
            isSystemNoise: true,
            systemNoiseReason: "parser_false_drop_incident",
        });

        const [normalReport, noisyReport] = await Promise.all([
            prisma.changeReport.create({ data: { scrapeRunId: normalRun.id, totalChanges: 1 } }),
            prisma.changeReport.create({ data: { scrapeRunId: noisyRun.id, totalChanges: 1 } }),
        ]);
        const product = await createProduct("noise-filter-product");

        await prisma.changeItem.createMany({
            data: [
                {
                    changeReportId: normalReport.id,
                    productId: product.id,
                    changeType: PrismaChangeType.PRICE_INCREASE,
                    oldPrice: "10.00",
                    newPrice: "11.00",
                },
                {
                    changeReportId: noisyReport.id,
                    productId: product.id,
                    changeType: PrismaChangeType.PRICE_DECREASE,
                    oldPrice: "11.00",
                    newPrice: "9.00",
                },
            ],
        });

        const runsResponse = await request(app)
            .get("/api/runs?page=1&pageSize=25")
            .set("Cookie", authCookie(user.id, user.email, "admin"));
        const changesResponse = await request(app)
            .get("/api/changes?page=1&pageSize=25&windowDays=30")
            .set("Cookie", authCookie(user.id, user.email, "admin"));

        expect(runsResponse.status).toBe(200);
        expect(runsResponse.body.items).toHaveLength(1);
        expect(runsResponse.body.items[0].id).toBe(normalRun.id);
        expect(changesResponse.status).toBe(200);
        expect(changesResponse.body.totalItems).toBe(1);
        expect(changesResponse.body.items[0].run.id).toBe(normalRun.id);
    });

    it("allows admins to opt in to system-noise runs", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "noise-include-admin@example.com", role: UserRole.ADMIN });
        const category = await createCategory("noise-include", "Noise Include");
        const noisyRun = await createRun(category.id, {
            isSystemNoise: true,
            systemNoiseReason: "parser_false_drop_incident",
        });

        const defaultResponse = await request(app)
            .get(`/api/runs/${noisyRun.id}`)
            .set("Cookie", authCookie(user.id, user.email, "admin"));
        const includeResponse = await request(app)
            .get(`/api/runs/${noisyRun.id}?includeSystemNoise=true`)
            .set("Cookie", authCookie(user.id, user.email, "admin"));
        const listResponse = await request(app)
            .get("/api/runs?page=1&pageSize=25&includeSystemNoise=true")
            .set("Cookie", authCookie(user.id, user.email, "admin"));

        expect(defaultResponse.status).toBe(404);
        expect(includeResponse.status).toBe(200);
        expect(includeResponse.body.run.id).toBe(noisyRun.id);
        expect(listResponse.status).toBe(200);
        expect(listResponse.body.items.some((item: { id: string }) => item.id === noisyRun.id)).toBe(true);
    });

    it("rejects includeSystemNoise for non-admin users", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "noise-include-user@example.com" });

        const response = await request(app)
            .get("/api/runs?page=1&pageSize=25&includeSystemNoise=true")
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(403);
        expect(response.body.error).toBe("forbidden");
    });

    it("validates global changes query parameters", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "global-changes-validation@example.com" });
        const oversizedQuery = "a".repeat(101);

        const response = await request(app)
            .get(`/api/changes?sortBy=invalid&windowDays=99&query=${oversizedQuery}`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("validation_error");
    });
});
