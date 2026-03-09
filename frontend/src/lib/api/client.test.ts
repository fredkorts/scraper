import { apiGet, apiPost } from "./client";
import { ApiError } from "./errors";

const jsonResponse = (status: number, payload: unknown): Response =>
    new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
    });

describe("api client 401 handling", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("retries unauthorized GET after refresh", async () => {
        let categoriesCalls = 0;
        let refreshCalls = 0;

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url.endsWith("/api/auth/csrf") && method === "GET") {
                document.cookie = "csrf_token=test-csrf-token; path=/";
                return jsonResponse(200, { success: true });
            }

            if (url.endsWith("/api/categories") && method === "GET") {
                categoriesCalls += 1;
                if (categoriesCalls === 1) {
                    return jsonResponse(401, { error: "unauthorized", message: "Unauthorized" });
                }

                return jsonResponse(200, { categories: [] });
            }

            if (url.endsWith("/api/auth/refresh") && method === "POST") {
                refreshCalls += 1;
                return jsonResponse(200, { user: null });
            }

            return jsonResponse(404, { error: "not_found", message: "Not found" });
        });

        vi.stubGlobal("fetch", fetchMock);

        const result = await apiGet<{ categories: unknown[] }>("/api/categories");

        expect(result.categories).toEqual([]);
        expect(categoriesCalls).toBe(2);
        expect(refreshCalls).toBe(1);
    });

    it("uses single-flight refresh for concurrent unauthorized GET requests", async () => {
        let categoriesCalls = 0;
        let refreshCalls = 0;

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url.endsWith("/api/auth/csrf") && method === "GET") {
                document.cookie = "csrf_token=test-csrf-token; path=/";
                return jsonResponse(200, { success: true });
            }

            if (url.endsWith("/api/categories") && method === "GET") {
                categoriesCalls += 1;
                if (categoriesCalls <= 2) {
                    return jsonResponse(401, { error: "unauthorized", message: "Unauthorized" });
                }

                return jsonResponse(200, { categories: [] });
            }

            if (url.endsWith("/api/auth/refresh") && method === "POST") {
                refreshCalls += 1;
                return jsonResponse(200, { user: null });
            }

            return jsonResponse(404, { error: "not_found", message: "Not found" });
        });

        vi.stubGlobal("fetch", fetchMock);

        await Promise.all([
            apiGet<{ categories: unknown[] }>("/api/categories"),
            apiGet<{ categories: unknown[] }>("/api/categories"),
        ]);

        expect(categoriesCalls).toBe(4);
        expect(refreshCalls).toBe(1);
    });

    it("does not refresh for unauthorized POST requests", async () => {
        let refreshCalls = 0;

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url.endsWith("/api/auth/csrf") && method === "GET") {
                document.cookie = "csrf_token=test-csrf-token; path=/";
                return jsonResponse(200, { success: true });
            }

            if (url.endsWith("/api/notifications/channels") && method === "POST") {
                return jsonResponse(401, { error: "unauthorized", message: "Unauthorized" });
            }

            if (url.endsWith("/api/auth/refresh") && method === "POST") {
                refreshCalls += 1;
                return jsonResponse(200, {});
            }

            return jsonResponse(404, { error: "not_found", message: "Not found" });
        });

        vi.stubGlobal("fetch", fetchMock);

        await expect(apiPost("/api/notifications/channels", { destination: "x" })).rejects.toBeInstanceOf(ApiError);
        expect(refreshCalls).toBe(0);
    });

    it("skips refresh interception for excluded auth endpoints", async () => {
        let refreshCalls = 0;

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url.endsWith("/api/auth/csrf") && method === "GET") {
                document.cookie = "csrf_token=test-csrf-token; path=/";
                return jsonResponse(200, { success: true });
            }

            if (url.endsWith("/api/auth/login") && method === "GET") {
                return jsonResponse(401, { error: "unauthorized", message: "Unauthorized" });
            }

            if (url.endsWith("/api/auth/refresh") && method === "POST") {
                refreshCalls += 1;
                return jsonResponse(200, {});
            }

            return jsonResponse(404, { error: "not_found", message: "Not found" });
        });

        vi.stubGlobal("fetch", fetchMock);

        await expect(apiGet("/api/auth/login")).rejects.toBeInstanceOf(ApiError);
        expect(refreshCalls).toBe(0);
    });

    it("recovers bootstrap /auth/me requests via refresh", async () => {
        let meCalls = 0;
        let refreshCalls = 0;

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url.endsWith("/api/auth/csrf") && method === "GET") {
                document.cookie = "csrf_token=test-csrf-token; path=/";
                return jsonResponse(200, { success: true });
            }

            if (url.endsWith("/api/auth/me") && method === "GET") {
                meCalls += 1;
                if (meCalls === 1) {
                    return jsonResponse(401, { error: "unauthorized", message: "Unauthorized" });
                }

                return jsonResponse(200, {
                    user: {
                        id: "11111111-1111-4111-8111-111111111111",
                        email: "user@example.com",
                    },
                });
            }

            if (url.endsWith("/api/auth/refresh") && method === "POST") {
                refreshCalls += 1;
                return jsonResponse(200, { user: null });
            }

            return jsonResponse(404, { error: "not_found", message: "Not found" });
        });

        vi.stubGlobal("fetch", fetchMock);

        const result = await apiGet<{ user: { email: string } }>("/api/auth/me", undefined, { authMode: "bootstrap" });

        expect(result.user.email).toBe("user@example.com");
        expect(meCalls).toBe(2);
        expect(refreshCalls).toBe(1);
    });

    it("retries refresh once when refresh returns csrf_mismatch", async () => {
        let csrfCalls = 0;
        let refreshCalls = 0;
        let categoriesCalls = 0;

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url.endsWith("/api/auth/csrf") && method === "GET") {
                csrfCalls += 1;
                document.cookie = `csrf_token=test-csrf-token-${csrfCalls}; path=/`;
                return jsonResponse(200, { csrfToken: `test-csrf-token-${csrfCalls}` });
            }

            if (url.endsWith("/api/categories") && method === "GET") {
                categoriesCalls += 1;
                if (categoriesCalls === 1) {
                    return jsonResponse(401, { error: "unauthorized", message: "Unauthorized" });
                }

                return jsonResponse(200, { categories: [] });
            }

            if (url.endsWith("/api/auth/refresh") && method === "POST") {
                refreshCalls += 1;
                if (refreshCalls === 1) {
                    return jsonResponse(403, { error: "csrf_mismatch", message: "CSRF token mismatch" });
                }

                return jsonResponse(200, { user: null });
            }

            return jsonResponse(404, { error: "not_found", message: "Not found" });
        });

        vi.stubGlobal("fetch", fetchMock);

        const result = await apiGet<{ categories: unknown[] }>("/api/categories");

        expect(result.categories).toEqual([]);
        expect(refreshCalls).toBe(2);
        expect(csrfCalls).toBe(1);
        expect(categoriesCalls).toBe(2);
    });
});
