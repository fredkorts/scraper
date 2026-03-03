import type { AuthUser } from "@mabrik/shared";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { act, render } from "@testing-library/react";
import { createAppRouter } from "../app/router";
import { queryKeys } from "../lib/query/query-keys";
import { createAppQueryClient } from "../lib/query/query-client";

export const mockUser: AuthUser = {
    id: "user-1",
    email: "user@example.com",
    name: "Example User",
    role: "free",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

interface RenderRouterOptions {
    initialEntry?: string;
    session?: AuthUser | null;
    apiResponses?: Partial<{
        categories: unknown;
        dashboardHome: unknown;
        runsList: unknown;
        runDetail: unknown;
        runProducts: unknown;
        runChanges: unknown;
        productDetail: unknown;
        productHistory: unknown;
    }>;
}

const jsonResponse = (payload: unknown): Response =>
    new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });

const defaultApiResponses = {
    dashboardHome: {
        latestRuns: [],
        recentFailures: [],
        recentChangeSummary: {
            priceIncrease: 0,
            priceDecrease: 0,
            newProduct: 0,
            soldOut: 0,
            backInStock: 0,
        },
    },
    categories: {
        categories: [
            {
                id: "22222222-2222-4222-8222-222222222222",
                slug: "board-games",
                nameEt: "Board Games",
                nameEn: "Board Games",
                isActive: true,
                scrapeIntervalHours: 12,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ],
    },
    runsList: {
        items: [],
        page: 1,
        pageSize: 25,
        totalItems: 0,
        totalPages: 0,
    },
    runDetail: {
        run: {
            id: "11111111-1111-4111-8111-111111111111",
            categoryId: "22222222-2222-4222-8222-222222222222",
            categoryName: "Board Games",
            status: "completed",
            totalProducts: 5,
            totalChanges: 2,
            newProducts: 1,
            priceChanges: 1,
            soldOut: 0,
            backInStock: 0,
            pagesScraped: 1,
            durationMs: 3000,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
        },
    },
    runProducts: {
        items: [],
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
    },
    runChanges: {
        items: [],
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
    },
    productDetail: {
        product: {
            id: "55555555-5555-4555-8555-555555555555",
            name: "Test Product",
            imageUrl: "https://mabrik.ee/images/test.jpg",
            externalUrl: "https://mabrik.ee/toode/test-product",
            currentPrice: 19.99,
            originalPrice: 24.99,
            inStock: true,
            firstSeenAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            historyPointCount: 2,
            categories: [
                {
                    id: "22222222-2222-4222-8222-222222222222",
                    slug: "board-games",
                    nameEt: "Board Games",
                    nameEn: "Board Games",
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
                price: 24.99,
                originalPrice: 29.99,
                inStock: true,
                scrapedAt: new Date().toISOString(),
            },
        ],
    },
};

export const renderRouterApp = async ({
    initialEntry = "/",
    session = null,
    apiResponses = {},
}: RenderRouterOptions = {}) => {
    const queryClient = createAppQueryClient();
    const mergedApiResponses = {
        ...defaultApiResponses,
        ...apiResponses,
    };

    const ensureSession = async (): Promise<AuthUser | null> => {
        queryClient.setQueryData(queryKeys.auth.me(), session);
        return session;
    };

    const history = createMemoryHistory({
        initialEntries: [initialEntry],
    });

    const router = createAppRouter(
        {
            queryClient,
            ensureSession,
        },
        history,
    );

    let renderedReturn: ReturnType<typeof render> | undefined;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/api/categories")) {
            return jsonResponse(mergedApiResponses.categories);
        }

        if (url.includes("/api/dashboard/home")) {
            return jsonResponse(mergedApiResponses.dashboardHome);
        }

        if (url.includes("/api/products/") && url.includes("/history")) {
            return jsonResponse(mergedApiResponses.productHistory);
        }

        if (url.includes("/api/products/")) {
            return jsonResponse(mergedApiResponses.productDetail);
        }

        if (url.includes("/api/runs/") && url.includes("/products")) {
            return jsonResponse(mergedApiResponses.runProducts);
        }

        if (url.includes("/api/runs/") && url.includes("/changes")) {
            return jsonResponse(mergedApiResponses.runChanges);
        }

        if (url.includes("/api/runs/")) {
            return jsonResponse(mergedApiResponses.runDetail);
        }

        if (url.includes("/api/runs")) {
            return jsonResponse(mergedApiResponses.runsList);
        }

        return new Response(JSON.stringify({ error: "not_found", message: "Not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
        });
    });

    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
        renderedReturn = render(
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>,
        );

        await router.load();
    });

    return {
        ...renderedReturn!,
        router,
        queryClient,
        fetchMock,
    };
};
