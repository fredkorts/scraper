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
        },
    });

const createProduct = async (
    suffix: string,
    overrides: Partial<{
        name: string;
        currentPrice: string;
        originalPrice: string | null;
        inStock: boolean;
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
        },
    });

describe("dashboard and runs routes", () => {
    it("rejects unauthenticated requests", async () => {
        const app = createApp();

        const dashboardResponse = await request(app).get("/api/dashboard/home");
        const runsResponse = await request(app).get("/api/runs");

        expect(dashboardResponse.status).toBe(401);
        expect(runsResponse.status).toBe(401);
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
});
