import type { AuthUser } from "@mabrik/shared";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { act, render } from "@testing-library/react";
import { createAppRouter } from "../app/router";
import { AppThemeProvider } from "../app/theme-provider";
import { queryKeys } from "../lib/query/query-keys";
import { createAppQueryClient } from "../lib/query/query-client";
import { AppNotificationProvider } from "../shared/notifications/notification-provider";

export const mockUser: AuthUser = {
    id: "11111111-1111-4111-8111-111111111111",
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
    logoutShouldFail?: boolean;
    apiResponses?: Partial<{
        categories: unknown;
        dashboardHome: unknown;
        changesList: unknown;
        runsList: unknown;
        runDetail: unknown;
        runProducts: unknown;
        runChanges: unknown;
        productDetail: unknown;
        productHistory: unknown;
        adminSchedulerState: unknown;
        subscriptions: unknown;
        notificationChannels: unknown;
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
    adminSchedulerState: {
        items: [
            {
                categoryId: "22222222-2222-4222-8222-222222222222",
                categorySlug: "lauamangud",
                categoryNameEt: "Lauamangud",
                categoryPathNameEt: "Lauamangud",
                isActive: true,
                scrapeIntervalHours: 12,
                nextRunAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                activeSubscriberCount: 1,
                eligibilityStatus: "not_due_yet",
                queueStatus: "idle",
                lastRunAt: new Date().toISOString(),
                lastRunStatus: "completed",
            },
            {
                categoryId: "33333333-3333-4333-8333-333333333333",
                categorySlug: "lauamangud/strateegia",
                categoryNameEt: "Strateegia",
                categoryPathNameEt: "Lauamangud / Strateegia",
                isActive: true,
                scrapeIntervalHours: 12,
                nextRunAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                activeSubscriberCount: 1,
                eligibilityStatus: "eligible",
                queueStatus: "queued",
                lastRunAt: new Date().toISOString(),
                lastRunStatus: "running",
            },
        ],
        generatedAt: new Date().toISOString(),
    },
    categories: {
        categories: [
            {
                id: "22222222-2222-4222-8222-222222222222",
                slug: "lauamangud",
                nameEt: "Lauamangud",
                nameEn: "Board Games",
                depth: 0,
                pathNameEt: "Lauamangud",
                pathNameEn: "Board Games",
                isActive: true,
                scrapeIntervalHours: 12,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: "33333333-3333-4333-8333-333333333333",
                slug: "lauamangud/strateegia",
                nameEt: "Strateegia",
                nameEn: "Strategy",
                parentId: "22222222-2222-4222-8222-222222222222",
                depth: 1,
                pathNameEt: "Lauamangud / Strateegia",
                pathNameEn: "Board Games / Strategy",
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
    changesList: {
        items: [],
        page: 1,
        pageSize: 25,
        totalItems: 0,
        totalPages: 0,
    },
    subscriptions: {
        items: [],
        limit: 3,
        used: 0,
        remaining: 3,
    },
    notificationChannels: {
        channels: [
            {
                id: "99999999-9999-4999-8999-999999999999",
                userId: "user-1",
                channelType: "email",
                destination: "user@example.com",
                isDefault: true,
                isActive: true,
                createdAt: new Date().toISOString(),
            },
        ],
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
    logoutShouldFail = false,
    apiResponses = {},
}: RenderRouterOptions = {}) => {
    if (typeof globalThis.ResizeObserver !== "function") {
        class ResizeObserverMock {
            observe(): void {}
            unobserve(): void {}
            disconnect(): void {}
        }

        vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    }

    if (typeof window.matchMedia !== "function") {
        vi.stubGlobal("matchMedia", (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
        }));
    }

    const queryClient = createAppQueryClient();
    const mergedApiResponses = {
        ...defaultApiResponses,
        ...apiResponses,
    };
    const mutableResponses = structuredClone(mergedApiResponses) as typeof mergedApiResponses;

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

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = input instanceof Request ? input.method : (init?.method ?? "GET");
        const parseBody = async (): Promise<unknown> => {
            if (input instanceof Request) {
                return input.json();
            }

            if (!init?.body || typeof init.body !== "string") {
                return {};
            }

            return JSON.parse(init.body);
        };

        if (url.includes("/api/categories")) {
            if (method === "PATCH") {
                const body = await parseBody();
                const id = url.split("/api/categories/")[1]?.split("/settings")[0];
                const categories = (mutableResponses.categories as { categories: Array<Record<string, unknown>> })
                    .categories;
                const category = categories.find((item) => item.id === id);

                if (category) {
                    category.scrapeIntervalHours = (body as { scrapeIntervalHours: number }).scrapeIntervalHours;
                }

                return jsonResponse({ category });
            }

            return jsonResponse(mutableResponses.categories);
        }

        if (url.includes("/api/admin/scheduler/state")) {
            return jsonResponse(mutableResponses.adminSchedulerState);
        }

        if (url.includes("/api/dashboard/home")) {
            return jsonResponse(mutableResponses.dashboardHome);
        }

        if (url.includes("/api/products/") && url.includes("/history")) {
            return jsonResponse(mergedApiResponses.productHistory);
        }

        if (url.includes("/api/products/")) {
            return jsonResponse(mergedApiResponses.productDetail);
        }

        if (url.includes("/api/runs/trigger")) {
            return jsonResponse({
                accepted: true,
                categoryId: "22222222-2222-4222-8222-222222222222",
                mode: "queued",
                jobId: "scrape:category:22222222-2222-4222-8222-222222222222",
            });
        }

        if (url.includes("/api/changes")) {
            return jsonResponse(mutableResponses.changesList);
        }

        if (url.includes("/api/runs/") && url.includes("/products")) {
            return jsonResponse(mergedApiResponses.runProducts);
        }

        if (url.includes("/api/runs/") && url.includes("/changes")) {
            return jsonResponse(mutableResponses.runChanges);
        }

        if (url.includes("/api/runs/")) {
            return jsonResponse(mutableResponses.runDetail);
        }

        if (url.includes("/api/runs")) {
            return jsonResponse(mutableResponses.runsList);
        }

        if (url.includes("/api/subscriptions")) {
            const payload = mutableResponses.subscriptions as {
                items: Array<Record<string, unknown>>;
                limit: number | null;
                used: number;
                remaining: number | null;
            };

            if (method === "POST") {
                const body = await parseBody();
                const categoryId = (body as { categoryId: string }).categoryId;
                const category = (
                    mutableResponses.categories as { categories: Array<Record<string, unknown>> }
                ).categories.find((item) => item.id === categoryId);

                if (category) {
                    payload.items.push({
                        id: "44444444-4444-4444-8444-444444444444",
                        category: {
                            id: category.id,
                            slug: category.slug,
                            nameEt: category.nameEt,
                            nameEn: category.nameEn,
                        },
                        createdAt: new Date().toISOString(),
                        isActive: true,
                    });
                    payload.used = payload.items.length;
                    payload.remaining = payload.limit === null ? null : Math.max(0, payload.limit - payload.used);
                    return jsonResponse({ item: payload.items[payload.items.length - 1] });
                }
            }

            if (method === "DELETE") {
                const id = url.split("/api/subscriptions/")[1];
                payload.items = payload.items.filter((item) => item.id !== id);
                payload.used = payload.items.length;
                payload.remaining = payload.limit === null ? null : Math.max(0, payload.limit - payload.used);
                mutableResponses.subscriptions = payload;
                return jsonResponse({ success: true });
            }

            return jsonResponse(payload);
        }

        if (url.includes("/api/notifications/channels")) {
            const payload = mutableResponses.notificationChannels as {
                channels: Array<Record<string, unknown>>;
            };

            if (method === "POST") {
                const body = await parseBody();
                const destination = String((body as { destination: string }).destination)
                    .trim()
                    .toLowerCase();
                const created = {
                    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    userId: session?.id ?? mockUser.id,
                    channelType: "email",
                    destination,
                    isDefault: payload.channels.every((channel) => !channel.isDefault),
                    isActive: true,
                    createdAt: new Date().toISOString(),
                };
                payload.channels.unshift(created);
                return jsonResponse({ channel: created });
            }

            if (method === "PATCH") {
                const id = url.split("/api/notifications/channels/")[1];
                const body = await parseBody();
                const channel = payload.channels.find((item) => item.id === id);

                if (channel) {
                    Object.assign(channel, body);
                    if ((body as { isDefault?: boolean }).isDefault) {
                        payload.channels.forEach((item) => {
                            if (item.id !== id) {
                                item.isDefault = false;
                            }
                        });
                    }
                }

                return jsonResponse({ channel });
            }

            if (method === "DELETE") {
                const id = url.split("/api/notifications/channels/")[1];
                payload.channels = payload.channels.filter((item) => item.id !== id);
                mutableResponses.notificationChannels = payload;
                return jsonResponse({ success: true });
            }

            return jsonResponse(payload);
        }

        if (url.includes("/api/auth/me") && method === "PATCH") {
            const body = await parseBody();
            const updatedUser = {
                ...(session ?? mockUser),
                name: (body as { name: string }).name,
            };
            return jsonResponse({ user: updatedUser });
        }

        if (url.includes("/api/auth/logout") && method === "POST") {
            if (logoutShouldFail) {
                return new Response(JSON.stringify({ error: "server_error", message: "Logout failed" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                });
            }

            return jsonResponse({ success: true });
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
                <AppThemeProvider>
                    <AppNotificationProvider>
                        <RouterProvider router={router} />
                    </AppNotificationProvider>
                </AppThemeProvider>
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
