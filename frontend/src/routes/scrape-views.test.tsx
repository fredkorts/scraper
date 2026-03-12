import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderRouterApp, mockUser } from "../test/router-utils";

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

const selectAntOption = async (user: ReturnType<typeof userEvent.setup>, label: string, optionText: string) => {
    await user.click(screen.getByLabelText(label));
    const titleMatch = await screen.findByTitle(optionText).catch(() => null);

    if (titleMatch) {
        await user.click(titleMatch);
        return;
    }

    const optionMatch = await screen.findByRole("option", { name: optionText }).catch(() => null);
    const treeItemMatch = optionMatch ?? (await screen.findByRole("treeitem", { name: optionText }).catch(() => null));

    if (treeItemMatch) {
        await user.click(treeItemMatch);
        return;
    }

    const textMatches = await screen.findAllByText(optionText);
    await user.click(textMatches[textMatches.length - 1]!);
};

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
        expect(screen.getByText("Filtered to Lauamangud")).toBeInTheDocument();
        expect(screen.getAllByText("Board Games").length).toBeGreaterThan(0);
        expect(screen.getByRole("link", { name: "Open run detail" })).toBeInTheDocument();
        expect(screen.getByText("The scrape timed out while loading page 31.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "View new products changes (2)" })).toBeInTheDocument();
    }, 10_000);

    it("routes dashboard summary cards to the changes explorer with prefilled filters", async () => {
        const user = userEvent.setup();
        const { router } = await renderRouterApp({
            initialEntry: "/app?categoryId=22222222-2222-4222-8222-222222222222",
            session: mockUser,
            apiResponses: {
                dashboardHome: {
                    latestRuns: [],
                    recentFailures: [],
                    recentChangeSummary: {
                        priceIncrease: 1,
                        priceDecrease: 0,
                        newProduct: 2,
                        soldOut: 1,
                        backInStock: 1,
                    },
                },
                changesList: {
                    items: [],
                    page: 1,
                    pageSize: 25,
                    totalItems: 0,
                    totalPages: 0,
                },
            },
        });

        await user.click(await screen.findByRole("link", { name: "View new products changes (2)" }));

        expect(await screen.findByRole("heading", { name: "Changes Explorer" })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe("/app/changes");
        expect(router.state.location.search).toMatchObject({
            changeType: "new_product",
            windowDays: 7,
            categoryId: "22222222-2222-4222-8222-222222222222",
        });
    });

    it("caps dashboard latest runs and recent failures panels to five items", async () => {
        await renderRouterApp({
            initialEntry: "/app",
            session: mockUser,
            apiResponses: {
                dashboardHome: {
                    latestRuns: Array.from({ length: 7 }, (_value, index) => {
                        const idSuffix = String(index + 1).padStart(12, "0");

                        return {
                            id: `11111111-1111-4111-8111-${idSuffix}`,
                            categoryId: "22222222-2222-4222-8222-222222222222",
                            categoryName: `Run Category ${index + 1}`,
                            status: "completed" as const,
                            startedAt: new Date().toISOString(),
                            completedAt: new Date().toISOString(),
                            totalChanges: index + 1,
                            totalProducts: 20 + index,
                        };
                    }),
                    recentFailures: Array.from({ length: 7 }, (_value, index) => {
                        const idSuffix = String(index + 1).padStart(12, "0");

                        return {
                            id: `33333333-3333-4333-8333-${idSuffix}`,
                            categoryId: "22222222-2222-4222-8222-222222222222",
                            categoryName: `Failure Category ${index + 1}`,
                            startedAt: new Date().toISOString(),
                            failure: {
                                summary: `Failure summary ${index + 1}`,
                                code: "upstream_timeout",
                                phase: "fetch",
                                pageNumber: index + 1,
                                isRetryable: true,
                            },
                        };
                    }),
                    recentChangeSummary: {
                        priceIncrease: 2,
                        priceDecrease: 3,
                        newProduct: 1,
                        soldOut: 4,
                        backInStock: 2,
                    },
                },
            },
        });

        expect(await screen.findByRole("heading", { name: "Dashboard Home" })).toBeInTheDocument();
        expect(screen.getAllByRole("link", { name: "Open run detail" })).toHaveLength(5);
        expect(screen.getAllByRole("link", { name: "Inspect failed run" })).toHaveLength(5);
        expect(screen.getByText("Run Category 5")).toBeInTheDocument();
        expect(screen.getByText("Failure Category 5")).toBeInTheDocument();
        expect(screen.queryByText("Run Category 6")).not.toBeInTheDocument();
        expect(screen.queryByText("Failure Category 6")).not.toBeInTheDocument();
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
        expect(screen.getByRole("link", { name: /Open run detail for/ })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /View failure reason for/ })).toBeInTheDocument();
    });

    it("renders changes explorer from URL-backed query state", async () => {
        const user = userEvent.setup();
        const { router } = await renderRouterApp({
            initialEntry:
                "/app/changes?page=2&pageSize=10&sortBy=changedAt&sortOrder=desc&changeType=sold_out&windowDays=30&query=change",
            session: mockUser,
            apiResponses: {
                changesList: {
                    items: [
                        {
                            id: "11111111-1111-4111-8111-111111111111",
                            changeType: "sold_out",
                            oldStockStatus: true,
                            newStockStatus: false,
                            changedAt: new Date().toISOString(),
                            category: {
                                id: "22222222-2222-4222-8222-222222222222",
                                nameEt: "Board Games",
                            },
                            run: {
                                id: "33333333-3333-4333-8333-333333333333",
                                startedAt: new Date().toISOString(),
                            },
                            product: {
                                id: "44444444-4444-4444-8444-444444444444",
                                name: "Change Product",
                                imageUrl: "https://mabrik.ee/images/change-product.jpg",
                                externalUrl: "https://mabrik.ee/toode/change-product",
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

        expect(await screen.findByRole("heading", { name: "Changes Explorer" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Advanced filters \(2\)/ })).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByText("Sorted by:")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Remove filter Change type: Sold out" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Remove filter Window: Last 30 days" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Remove filter Page size: 10" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Remove filter Search: change" })).toBeInTheDocument();
        expect(screen.getByText("Change Product")).toBeInTheDocument();
        expect(screen.getByLabelText("Search change results")).toHaveValue("change");
        expect(screen.queryByRole("columnheader", { name: "Run" })).not.toBeInTheDocument();
        expect(screen.queryByRole("columnheader", { name: "Link" })).not.toBeInTheDocument();

        await user.click(screen.getByText("Board Games"));

        await waitFor(() => {
            expect(router.state.location.pathname).toBe("/app/products/44444444-4444-4444-8444-444444444444");
        });
    }, 10_000);

    it("renders PriceTag variants in changes explorer details cells", async () => {
        await renderRouterApp({
            initialEntry: "/app/changes",
            session: mockUser,
            apiResponses: {
                changesList: {
                    items: [
                        {
                            id: "11111111-1111-4111-8111-111111111111",
                            changeType: "new_product",
                            newPrice: 11.2,
                            changedAt: new Date().toISOString(),
                            category: {
                                id: "22222222-2222-4222-8222-222222222222",
                                nameEt: "Board Games",
                            },
                            run: {
                                id: "33333333-3333-4333-8333-333333333333",
                                startedAt: new Date().toISOString(),
                            },
                            product: {
                                id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                                name: "New Product",
                                imageUrl: "https://mabrik.ee/images/new-product.jpg",
                                externalUrl: "https://mabrik.ee/toode/new-product",
                            },
                        },
                        {
                            id: "22222222-2222-4222-8222-222222222222",
                            changeType: "price_increase",
                            oldPrice: 9.5,
                            newPrice: 11.2,
                            changedAt: new Date().toISOString(),
                            category: {
                                id: "22222222-2222-4222-8222-222222222222",
                                nameEt: "Board Games",
                            },
                            run: {
                                id: "33333333-3333-4333-8333-333333333333",
                                startedAt: new Date().toISOString(),
                            },
                            product: {
                                id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                                name: "Increase Product",
                                imageUrl: "https://mabrik.ee/images/increase-product.jpg",
                                externalUrl: "https://mabrik.ee/toode/increase-product",
                            },
                        },
                        {
                            id: "33333333-3333-4333-8333-333333333333",
                            changeType: "price_decrease",
                            oldPrice: 24.99,
                            newPrice: 19.99,
                            changedAt: new Date().toISOString(),
                            category: {
                                id: "22222222-2222-4222-8222-222222222222",
                                nameEt: "Board Games",
                            },
                            run: {
                                id: "33333333-3333-4333-8333-333333333333",
                                startedAt: new Date().toISOString(),
                            },
                            product: {
                                id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                                name: "Decrease Product",
                                imageUrl: "https://mabrik.ee/images/decrease-product.jpg",
                                externalUrl: "https://mabrik.ee/toode/decrease-product",
                            },
                        },
                    ],
                    page: 1,
                    pageSize: 25,
                    totalItems: 3,
                    totalPages: 1,
                },
            },
        });

        expect(await screen.findByRole("heading", { name: "Changes Explorer" })).toBeInTheDocument();
        expect(screen.getByLabelText(/New product price/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Price increased from/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Price decreased from/)).toBeInTheDocument();
        expect(screen.getByText(/\+.*1[.,]70/)).toBeInTheDocument();
        expect(screen.getByText(/-.*5[.,]00/)).toBeInTheDocument();
        expect(screen.getAllByText("→").length).toBeGreaterThanOrEqual(2);
    });

    it("keeps advanced filters collapsed by default and allows toggling open", async () => {
        const user = userEvent.setup();

        await renderRouterApp({
            initialEntry: "/app/changes",
            session: mockUser,
            apiResponses: {
                changesList: {
                    items: [],
                    page: 1,
                    pageSize: 25,
                    totalItems: 0,
                    totalPages: 0,
                },
            },
        });

        expect(await screen.findByRole("heading", { name: "Changes Explorer" })).toBeInTheDocument();
        const toggle = screen.getByRole("button", { name: /Advanced filters/ });

        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByLabelText("Preorder")).not.toBeInTheDocument();

        await user.click(toggle);

        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByLabelText("Preorder")).toBeInTheDocument();
        expect(screen.getByLabelText("Window")).toBeInTheDocument();
        expect(screen.getByLabelText("Page size")).toBeInTheDocument();
    });

    it("renders run detail with readable failure metadata for non-admin users", async () => {
        const user = userEvent.setup();
        const { router } = await renderRouterApp({
            initialEntry: "/app/runs/11111111-1111-4111-8111-111111111111?changesQuery=test&productsQuery=snapshot",
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
                            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                            changeType: "new_product",
                            newPrice: 11.2,
                            product: {
                                id: "66666666-6666-4666-8666-666666666666",
                                name: "Fresh Product",
                                imageUrl: "https://mabrik.ee/images/fresh.jpg",
                                externalUrl: "https://mabrik.ee/toode/fresh-product",
                            },
                        },
                        {
                            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                            changeType: "price_increase",
                            oldPrice: 9.5,
                            newPrice: 11.2,
                            product: {
                                id: "77777777-7777-4777-8777-777777777777",
                                name: "Growing Product",
                                imageUrl: "https://mabrik.ee/images/growing.jpg",
                                externalUrl: "https://mabrik.ee/toode/growing-product",
                            },
                        },
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
        expect(screen.getByLabelText("Search diff items")).toHaveValue("test");
        expect(screen.getByLabelText("Search product snapshots")).toHaveValue("snapshot");
        expect(screen.getAllByText("Test Product").length).toBeGreaterThan(0);
        expect(screen.queryByRole("columnheader", { name: "Dashboard" })).not.toBeInTheDocument();
        expect(screen.queryByRole("columnheader", { name: "Link" })).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Product Snapshots" })).toBeInTheDocument();
        expect(screen.getByLabelText(/New product price/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Price increased from/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Price decreased from/)).toBeInTheDocument();
        expect(screen.getByText(/\+.*1[.,]70/)).toBeInTheDocument();
        expect(screen.getByText(/-.*5[.,]00/)).toBeInTheDocument();

        await user.click(screen.getByText("Price Decrease"));
        await waitFor(() => {
            expect(router.state.location.pathname).toBe("/app/products/55555555-5555-4555-8555-555555555555");
        });
    });

    it("navigates to product detail when clicking run detail product snapshot rows", async () => {
        const user = userEvent.setup();
        const { router } = await renderRouterApp({
            initialEntry: "/app/runs/11111111-1111-4111-8111-111111111111",
            session: mockUser,
            apiResponses: {
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

        expect(await screen.findByRole("heading", { name: "Board Games" })).toBeInTheDocument();

        await user.click(screen.getByText("In stock"));

        await waitFor(() => {
            expect(router.state.location.pathname).toBe("/app/products/55555555-5555-4555-8555-555555555555");
        });
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
        const user = userEvent.setup();

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

        expect(await screen.findByRole("heading", { name: "Test Product" }, { timeout: 5000 })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Price History" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Recent Runs" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Open on Mabrik" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Open run detail" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Show table fallback" }));
        expect(screen.getByRole("heading", { name: "History Table" })).toBeInTheDocument();
        expect(screen.queryByRole("columnheader", { name: "Run" })).not.toBeInTheDocument();
        expect(document.querySelector("a button")).toBeNull();
        expect(document.querySelector("button a")).toBeNull();
    }, 15_000);

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
        expect(router.state.location.search).toMatchObject({
            range: "all",
        });
        expect(screen.getByLabelText("Show original price")).toBeChecked();
        expect(screen.getByLabelText("Show stock overlay")).toBeChecked();
        expect(screen.getByText("3 filtered state-change snapshots")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Show table fallback" }));
        expect(screen.getByRole("heading", { name: "History Table" })).toBeInTheDocument();
        expect(screen.queryByRole("columnheader", { name: "Run" })).not.toBeInTheDocument();

        await selectAntOption(user, "Category", "Card Games");
        expect(await screen.findByText("1 filtered state-change snapshots")).toBeInTheDocument();
        expect(router.state.location.search).toMatchObject({
            categoryId: "99999999-9999-4999-8999-999999999999",
        });
        expect(screen.getAllByText("€21.99").length).toBeGreaterThan(0);

        await selectAntOption(user, "Stock filter", "In stock only");
        expect(
            await screen.findByText(
                "No historical snapshots matched the current controls. Change the filters or reset them.",
            ),
        ).toBeInTheDocument();

        await selectAntOption(user, "Stock filter", "Out of stock only");
        expect(await screen.findByText("1 filtered state-change snapshots")).toBeInTheDocument();
        expect(screen.getByText("Out of stock")).toBeInTheDocument();

        await user.click(screen.getByLabelText("Show stock overlay"));
        expect(screen.getByLabelText("Show stock overlay")).not.toBeChecked();
        expect(router.state.location.search).toMatchObject({
            stockFilter: "out_of_stock",
            showStockOverlay: false,
        });
    }, 15000);

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
