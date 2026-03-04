import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderRouterApp, mockUser } from "../test/router-utils";

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("scrape views", () => {
    it("renders dashboard home summaries and links", async () => {
        await renderRouterApp({
            initialEntry: "/app?categoryId=22222222-2222-4222-8222-222222222222",
            session: mockUser,
            apiResponses: {
                subscriptions: {
                    items: [
                        {
                            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                            category: {
                                id: "22222222-2222-4222-8222-222222222222",
                                slug: "lauamangud",
                                nameEt: "Lauamangud",
                                nameEn: "Board Games",
                            },
                            createdAt: new Date().toISOString(),
                            isActive: true,
                        },
                    ],
                    limit: 3,
                    used: 1,
                    remaining: 2,
                },
                dashboardHome: {
                    latestRuns: [
                        {
                            id: "11111111-1111-4111-8111-111111111111",
                            categoryId: "22222222-2222-4222-8222-222222222222",
                            categoryName: "Board Games",
                            status: "completed",
                            startedAt: new Date().toISOString(),
                            completedAt: new Date().toISOString(),
                            totalChanges: 8,
                            totalProducts: 24,
                        },
                    ],
                    recentFailures: [
                        {
                            id: "33333333-3333-4333-8333-333333333333",
                            categoryId: "22222222-2222-4222-8222-222222222222",
                            categoryName: "Board Games",
                            startedAt: new Date().toISOString(),
                            failure: {
                                summary: "The scrape timed out while loading page 31.",
                                code: "upstream_timeout",
                                phase: "fetch",
                                pageNumber: 31,
                                isRetryable: true,
                            },
                        },
                    ],
                    recentChangeSummary: {
                        priceIncrease: 1,
                        priceDecrease: 5,
                        newProduct: 2,
                        soldOut: 1,
                        backInStock: 1,
                    },
                },
            },
        });

        expect(await screen.findByRole("heading", { name: "Dashboard Home" })).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByLabelText("Category")).toHaveValue("22222222-2222-4222-8222-222222222222");
        });
        expect(screen.getAllByText("Board Games").length).toBeGreaterThan(0);
        expect(screen.getByRole("link", { name: "Open run detail" })).toBeInTheDocument();
        expect(screen.getByText("The scrape timed out while loading page 31.")).toBeInTheDocument();
    });

    it("renders runs list from URL-backed query state", async () => {
        await renderRouterApp({
            initialEntry: "/app/runs?page=2&pageSize=10&status=failed",
            session: mockUser,
            apiResponses: {
                runsList: {
                    items: [
                        {
                            id: "11111111-1111-4111-8111-111111111111",
                            categoryId: "22222222-2222-4222-8222-222222222222",
                            categoryName: "Miniatures",
                            status: "failed",
                            totalProducts: 18,
                            totalChanges: 0,
                            pagesScraped: 2,
                            durationMs: 4200,
                            startedAt: new Date().toISOString(),
                            completedAt: new Date().toISOString(),
                            failure: {
                                summary: "The scrape received HTTP 500 while loading page 4.",
                                code: "http_error",
                                phase: "fetch",
                                pageNumber: 4,
                                isRetryable: true,
                            },
                        },
                    ],
                    page: 2,
                    pageSize: 10,
                    totalItems: 11,
                    totalPages: 2,
                },
            },
        });

        expect(await screen.findByRole("heading", { name: "Scrape Runs" })).toBeInTheDocument();
        expect(screen.getByText("Miniatures")).toBeInTheDocument();
        expect(screen.getByText("11 total runs")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Open detail" })).toBeInTheDocument();
        expect(screen.getByText("The scrape received HTTP 500 while loading page 4.")).toBeInTheDocument();
    });

    it("renders run detail with readable failure metadata for non-admin users", async () => {
        await renderRouterApp({
            initialEntry: "/app/runs/11111111-1111-4111-8111-111111111111",
            session: mockUser,
            apiResponses: {
                runDetail: {
                    run: {
                        id: "11111111-1111-4111-8111-111111111111",
                        categoryId: "22222222-2222-4222-8222-222222222222",
                        categoryName: "Card Games",
                        status: "failed",
                        totalProducts: 14,
                        totalChanges: 3,
                        newProducts: 1,
                        priceChanges: 2,
                        soldOut: 1,
                        backInStock: 0,
                        pagesScraped: 1,
                        durationMs: 5000,
                        failure: {
                            summary: "The scrape timed out while loading page 31.",
                            code: "upstream_timeout",
                            phase: "fetch",
                            pageUrl: "https://mabrik.ee/tootekategooria/lauamangud/page/31/",
                            pageNumber: 31,
                            isRetryable: true,
                            technicalMessage: "timeout of 45000ms exceeded",
                        },
                        startedAt: new Date().toISOString(),
                        completedAt: new Date().toISOString(),
                    },
                },
                runChanges: {
                    items: [
                        {
                            id: "44444444-4444-4444-8444-444444444444",
                            changeType: "price_decrease",
                            oldPrice: 24.99,
                            newPrice: 19.99,
                            product: {
                                id: "55555555-5555-4555-8555-555555555555",
                                name: "Test Product",
                                imageUrl: "https://mabrik.ee/images/test.jpg",
                                externalUrl: "https://mabrik.ee/toode/test-product",
                            },
                        },
                    ],
                    page: 1,
                    pageSize: 10,
                    totalItems: 1,
                    totalPages: 1,
                },
                runProducts: {
                    items: [
                        {
                            id: "66666666-6666-4666-8666-666666666666",
                            scrapeRunId: "11111111-1111-4111-8111-111111111111",
                            productId: "55555555-5555-4555-8555-555555555555",
                            name: "Test Product",
                            price: 19.99,
                            originalPrice: 24.99,
                            inStock: true,
                            imageUrl: "https://mabrik.ee/images/test.jpg",
                            externalUrl: "https://mabrik.ee/toode/test-product",
                            scrapedAt: new Date().toISOString(),
                        },
                    ],
                    page: 1,
                    pageSize: 10,
                    totalItems: 1,
                    totalPages: 1,
                },
            },
        });

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Card Games" })).toBeInTheDocument();
        });
        expect(screen.getByText("The scrape timed out while loading page 31.")).toBeInTheDocument();
        expect(screen.getByText("Fetch")).toBeInTheDocument();
        expect(screen.getByText("31")).toBeInTheDocument();
        expect(screen.getByText("Yes")).toBeInTheDocument();
        expect(screen.queryByText("timeout of 45000ms exceeded")).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Diff Items" })).toBeInTheDocument();
        expect(screen.getAllByText("Test Product").length).toBeGreaterThan(0);
        expect(screen.getByRole("link", { name: "Open product" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Product Snapshots" })).toBeInTheDocument();
    });

    it("renders technical failure details for admin users only", async () => {
        await renderRouterApp({
            initialEntry: "/app/runs/11111111-1111-4111-8111-111111111111",
            session: {
                ...mockUser,
                role: "admin",
            },
            apiResponses: {
                runDetail: {
                    run: {
                        id: "11111111-1111-4111-8111-111111111111",
                        categoryId: "22222222-2222-4222-8222-222222222222",
                        categoryName: "Card Games",
                        status: "failed",
                        totalProducts: 14,
                        totalChanges: 0,
                        newProducts: 0,
                        priceChanges: 0,
                        soldOut: 0,
                        backInStock: 0,
                        pagesScraped: 1,
                        durationMs: 5000,
                        failure: {
                            summary: "The scrape timed out while loading page 31.",
                            code: "upstream_timeout",
                            phase: "fetch",
                            pageUrl: "https://mabrik.ee/tootekategooria/lauamangud/page/31/",
                            pageNumber: 31,
                            isRetryable: true,
                            technicalMessage: "timeout of 45000ms exceeded",
                        },
                        startedAt: new Date().toISOString(),
                        completedAt: new Date().toISOString(),
                    },
                },
            },
        });

        expect(await screen.findByText("Technical details")).toBeInTheDocument();
        expect(screen.getByText("timeout of 45000ms exceeded")).toBeInTheDocument();
    });

    it("renders product detail and history views", async () => {
        await renderRouterApp({
            initialEntry: "/app/products/55555555-5555-4555-8555-555555555555",
            session: mockUser,
            apiResponses: {
                productDetail: {
                    product: {
                        id: "55555555-5555-4555-8555-555555555555",
                        name: "Test Product",
                        imageUrl: "https://mabrik.ee/images/test.jpg",
                        externalUrl: "https://mabrik.ee/toode/test-product",
                        currentPrice: 19.99,
                        originalPrice: 24.99,
                        inStock: true,
                        firstSeenAt: new Date("2026-02-20T10:00:00.000Z").toISOString(),
                        lastSeenAt: new Date("2026-03-01T10:00:00.000Z").toISOString(),
                        historyPointCount: 2,
                        categories: [
                            {
                                id: "22222222-2222-4222-8222-222222222222",
                                slug: "board-games",
                                nameEt: "Board Games",
                                nameEn: "Board Games",
                            },
                        ],
                        recentRuns: [
                            {
                                id: "11111111-1111-4111-8111-111111111111",
                                categoryId: "22222222-2222-4222-8222-222222222222",
                                categoryName: "Board Games",
                                status: "completed",
                                startedAt: new Date("2026-03-01T10:00:00.000Z").toISOString(),
                                completedAt: new Date("2026-03-01T10:03:00.000Z").toISOString(),
                            },
                        ],
                    },
                },
                productHistory: {
                    items: [
                        {
                            id: "77777777-7777-4777-8777-777777777777",
                            scrapeRunId: "11111111-1111-4111-8111-111111111111",
                            categoryId: "22222222-2222-4222-8222-222222222222",
                            categoryName: "Board Games",
                            price: 24.99,
                            originalPrice: 29.99,
                            inStock: true,
                            scrapedAt: new Date("2026-02-20T10:00:00.000Z").toISOString(),
                        },
                        {
                            id: "88888888-8888-4888-8888-888888888888",
                            scrapeRunId: "11111111-1111-4111-8111-111111111111",
                            categoryId: "22222222-2222-4222-8222-222222222222",
                            categoryName: "Board Games",
                            price: 19.99,
                            originalPrice: 24.99,
                            inStock: true,
                            scrapedAt: new Date("2026-03-01T10:00:00.000Z").toISOString(),
                        },
                    ],
                },
            },
        });

        expect(await screen.findByRole("heading", { name: "Test Product" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Price History" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Recent Runs" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "History Table" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Open on Mabrik" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Open run detail" })).toBeInTheDocument();
    });

    it("updates product history view when controls change", async () => {
        const user = userEvent.setup();

        const { router } = await renderRouterApp({
            initialEntry:
                "/app/products/55555555-5555-4555-8555-555555555555?range=all&showOriginalPrice=true&showStockOverlay=true",
            session: mockUser,
            apiResponses: {
                productDetail: {
                    product: {
                        id: "55555555-5555-4555-8555-555555555555",
                        name: "Control Product",
                        imageUrl: "https://mabrik.ee/images/control.jpg",
                        externalUrl: "https://mabrik.ee/toode/control-product",
                        currentPrice: 18.99,
                        originalPrice: 24.99,
                        inStock: true,
                        firstSeenAt: new Date("2025-12-20T10:00:00.000Z").toISOString(),
                        lastSeenAt: new Date("2026-03-01T10:00:00.000Z").toISOString(),
                        historyPointCount: 3,
                        categories: [
                            {
                                id: "22222222-2222-4222-8222-222222222222",
                                slug: "board-games",
                                nameEt: "Board Games",
                                nameEn: "Board Games",
                            },
                            {
                                id: "99999999-9999-4999-8999-999999999999",
                                slug: "card-games",
                                nameEt: "Card Games",
                                nameEn: "Card Games",
                            },
                        ],
                        recentRuns: [],
                    },
                },
                productHistory: {
                    items: [
                        {
                            id: "77777777-7777-4777-8777-777777777777",
                            scrapeRunId: "11111111-1111-4111-8111-111111111111",
                            categoryId: "22222222-2222-4222-8222-222222222222",
                            categoryName: "Board Games",
                            price: 29.99,
                            originalPrice: 34.99,
                            inStock: true,
                            scrapedAt: new Date("2026-01-10T10:00:00.000Z").toISOString(),
                        },
                        {
                            id: "88888888-8888-4888-8888-888888888888",
                            scrapeRunId: "11111111-1111-4111-8111-111111111111",
                            categoryId: "99999999-9999-4999-8999-999999999999",
                            categoryName: "Card Games",
                            price: 21.99,
                            originalPrice: 26.99,
                            inStock: false,
                            scrapedAt: new Date("2026-02-20T10:00:00.000Z").toISOString(),
                        },
                        {
                            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                            scrapeRunId: "11111111-1111-4111-8111-111111111111",
                            categoryId: "22222222-2222-4222-8222-222222222222",
                            categoryName: "Board Games",
                            price: 18.99,
                            originalPrice: 24.99,
                            inStock: true,
                            scrapedAt: new Date("2026-03-01T10:00:00.000Z").toISOString(),
                        },
                    ],
                },
            },
        });

        expect(await screen.findByRole("heading", { name: "Control Product" })).toBeInTheDocument();
        expect(screen.getByLabelText("Time range")).toHaveValue("all");
        expect(screen.getByLabelText("Show original price")).toBeChecked();
        expect(screen.getByLabelText("Show stock overlay")).toBeChecked();
        expect(screen.getByText("3 filtered state-change snapshots")).toBeInTheDocument();

        await user.selectOptions(screen.getByLabelText("Category"), "99999999-9999-4999-8999-999999999999");
        expect(await screen.findByText("1 filtered state-change snapshots")).toBeInTheDocument();
        expect(router.state.location.search).toMatchObject({
            categoryId: "99999999-9999-4999-8999-999999999999",
        });
        expect(screen.getByLabelText("Category")).toHaveValue("99999999-9999-4999-8999-999999999999");
        expect(within(screen.getByText("Latest filtered price").closest("article")!).getByText("€21.99")).toBeInTheDocument();

        await user.selectOptions(screen.getByLabelText("Stock filter"), "in_stock");
        expect(
            await screen.findByText("No historical snapshots matched the current controls. Change the time range, category, or stock filter."),
        ).toBeInTheDocument();

        await user.selectOptions(screen.getByLabelText("Stock filter"), "out_of_stock");
        expect(await screen.findByText("1 filtered state-change snapshots")).toBeInTheDocument();
        expect(screen.getByText("Out of stock")).toBeInTheDocument();

        await user.click(screen.getByLabelText("Show stock overlay"));
        expect(screen.getByLabelText("Show stock overlay")).not.toBeChecked();
        expect(router.state.location.search).toMatchObject({
            stockFilter: "out_of_stock",
            showStockOverlay: false,
        });
    });

    it("clamps out-of-range runs pages to the last valid page", async () => {
        const { router } = await renderRouterApp({
            initialEntry: "/app/runs?page=9&pageSize=10",
            session: mockUser,
            apiResponses: {
                runsList: {
                    items: [
                        {
                            id: "11111111-1111-4111-8111-111111111111",
                            categoryId: "22222222-2222-4222-8222-222222222222",
                            categoryName: "Miniatures",
                            status: "completed",
                            totalProducts: 18,
                            totalChanges: 1,
                            pagesScraped: 2,
                            durationMs: 4200,
                            startedAt: new Date().toISOString(),
                            completedAt: new Date().toISOString(),
                        },
                    ],
                    page: 9,
                    pageSize: 10,
                    totalItems: 19,
                    totalPages: 2,
                },
            },
        });

        expect(await screen.findByRole("heading", { name: "Scrape Runs" })).toBeInTheDocument();
        await waitFor(() => {
            expect(router.state.location.search).toMatchObject({
                page: 2,
            });
        });
    });

    it("clamps out-of-range run-detail section pages to valid values", async () => {
        const { router } = await renderRouterApp({
            initialEntry:
                "/app/runs/11111111-1111-4111-8111-111111111111?changesPage=7&changesPageSize=10&productsPage=8&productsPageSize=10",
            session: mockUser,
            apiResponses: {
                runChanges: {
                    items: [],
                    page: 7,
                    pageSize: 10,
                    totalItems: 0,
                    totalPages: 0,
                },
                runProducts: {
                    items: [],
                    page: 8,
                    pageSize: 10,
                    totalItems: 0,
                    totalPages: 0,
                },
            },
        });

        expect(await screen.findByRole("heading", { name: "Board Games" })).toBeInTheDocument();
        await waitFor(() => {
            expect(router.state.location.search).toMatchObject({
                changesPage: 1,
                productsPage: 1,
            });
        });
    });
});
