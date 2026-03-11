import { afterEach, describe, expect, it, vi } from "vitest";

const jsonResponse = (status: number, payload: unknown): Response =>
    new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
    });

const importClientWithCooldownEnabled = async () => {
    vi.resetModules();
    vi.doMock("./config", () => ({
        apiBaseUrl: "http://localhost:3001",
        authRecoveryCooldownEnabled: true,
    }));

    return import("./client");
};

describe("api client rate-limit cooldown", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("activates cooldown after refresh 429 and blocks immediate follow-up refresh attempts", async () => {
        let categoriesCalls = 0;
        let refreshCalls = 0;

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url.endsWith("/api/auth/csrf") && method === "GET") {
                document.cookie = "csrf_token=test-csrf-token; path=/";
                return jsonResponse(200, { csrfToken: "test-csrf-token" });
            }

            if (url.endsWith("/api/categories") && method === "GET") {
                categoriesCalls += 1;
                return jsonResponse(401, { error: "unauthorized", message: "Unauthorized" });
            }

            if (url.endsWith("/api/auth/refresh") && method === "POST") {
                refreshCalls += 1;
                return jsonResponse(429, {
                    error: "rate_limit_exceeded",
                    message: "Too many requests, please try again later.",
                    retryAfterSeconds: 60,
                    limiter: "auth-mutation",
                });
            }

            return jsonResponse(404, { error: "not_found", message: "Not found" });
        });

        vi.stubGlobal("fetch", fetchMock);

        const { apiGet } = await importClientWithCooldownEnabled();

        await expect(apiGet("/api/categories")).rejects.toMatchObject({
            status: 429,
            code: "rate_limit_exceeded",
        });
        await expect(apiGet("/api/categories")).rejects.toMatchObject({
            status: 429,
            code: "rate_limit_exceeded",
        });

        expect(categoriesCalls).toBe(2);
        expect(refreshCalls).toBe(1);
    });

    it("syncs cooldown across tabs via storage event and skips refresh network call", async () => {
        let categoriesCalls = 0;
        let refreshCalls = 0;

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url.endsWith("/api/categories") && method === "GET") {
                categoriesCalls += 1;
                return jsonResponse(401, { error: "unauthorized", message: "Unauthorized" });
            }

            if (url.endsWith("/api/auth/refresh") && method === "POST") {
                refreshCalls += 1;
                return jsonResponse(200, {});
            }

            if (url.endsWith("/api/auth/csrf") && method === "GET") {
                document.cookie = "csrf_token=test-csrf-token; path=/";
                return jsonResponse(200, { csrfToken: "test-csrf-token" });
            }

            return jsonResponse(404, { error: "not_found", message: "Not found" });
        });

        vi.stubGlobal("fetch", fetchMock);

        const { apiGet } = await importClientWithCooldownEnabled();
        const now = Date.now();
        window.dispatchEvent(
            new StorageEvent("storage", {
                key: "pricepulse:auth-recovery-cooldown",
                newValue: JSON.stringify({
                    cooldownUntilMs: now + 90_000,
                    retryAfterSeconds: 90,
                    timestamp: now,
                }),
            }),
        );

        await expect(apiGet("/api/categories")).rejects.toMatchObject({
            status: 429,
            code: "rate_limit_exceeded",
        });

        expect(categoriesCalls).toBe(1);
        expect(refreshCalls).toBe(0);
    });

    it("surfaces bootstrap /auth/me 429 metadata without refresh retry", async () => {
        let refreshCalls = 0;

        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            const method = init?.method ?? "GET";

            if (url.endsWith("/api/auth/me") && method === "GET") {
                return jsonResponse(429, {
                    error: "rate_limit_exceeded",
                    message: "Too many requests, please try again later.",
                    retryAfterSeconds: 45,
                    limiter: "api-read",
                });
            }

            if (url.endsWith("/api/auth/refresh") && method === "POST") {
                refreshCalls += 1;
                return jsonResponse(200, {});
            }

            if (url.endsWith("/api/auth/csrf") && method === "GET") {
                document.cookie = "csrf_token=test-csrf-token; path=/";
                return jsonResponse(200, { csrfToken: "test-csrf-token" });
            }

            return jsonResponse(404, { error: "not_found", message: "Not found" });
        });

        vi.stubGlobal("fetch", fetchMock);

        const { apiGet } = await importClientWithCooldownEnabled();

        let thrown: unknown;
        try {
            await apiGet("/api/auth/me", undefined, { authMode: "bootstrap" });
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toMatchObject({
            status: 429,
            code: "rate_limit_exceeded",
            retryAfterSeconds: 45,
            limiter: "api-read",
        });
        expect(refreshCalls).toBe(0);
    });
});
