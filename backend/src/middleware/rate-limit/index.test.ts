import { describe, expect, it } from "vitest";
import { config } from "../../config";
import { getIpLimiterKey, getLimiterKey, getLoginAttemptLimiterKey, shouldSkipAuthenticatedIpCeiling } from "./index";

describe("rate-limit key strategy", () => {
    it("uses ip keying when user-keying feature flag is disabled", () => {
        const originalFlag = config.RATE_LIMIT_USER_KEYING_ENABLED;
        config.RATE_LIMIT_USER_KEYING_ENABLED = false;

        const key = getLimiterKey({
            ip: "203.0.113.10",
            auth: {
                userId: "user-1",
                email: "user@example.com",
                role: "paid",
                tokenType: "access",
            },
        });

        expect(key).toBe(getIpLimiterKey({ ip: "203.0.113.10" }));

        config.RATE_LIMIT_USER_KEYING_ENABLED = originalFlag;
    });

    it("uses user keying when flag enabled and auth context exists", () => {
        const originalFlag = config.RATE_LIMIT_USER_KEYING_ENABLED;
        config.RATE_LIMIT_USER_KEYING_ENABLED = true;

        const key = getLimiterKey({
            ip: "203.0.113.10",
            auth: {
                userId: "user-2",
                email: "user2@example.com",
                role: "free",
                tokenType: "access",
            },
        });

        expect(key).toBe("user:user-2");

        config.RATE_LIMIT_USER_KEYING_ENABLED = originalFlag;
    });

    it("falls back to ip keying when flag enabled but request is unauthenticated", () => {
        const originalFlag = config.RATE_LIMIT_USER_KEYING_ENABLED;
        config.RATE_LIMIT_USER_KEYING_ENABLED = true;

        const key = getLimiterKey({
            ip: "198.51.100.42",
            auth: undefined,
        });

        expect(key).toBe(getIpLimiterKey({ ip: "198.51.100.42" }));

        config.RATE_LIMIT_USER_KEYING_ENABLED = originalFlag;
    });
});

describe("authenticated ip ceiling skip logic", () => {
    it("skips authenticated ip ceiling when feature flag is disabled", () => {
        const originalFlag = config.RATE_LIMIT_USER_KEYING_ENABLED;
        config.RATE_LIMIT_USER_KEYING_ENABLED = false;

        expect(
            shouldSkipAuthenticatedIpCeiling({
                auth: {
                    userId: "user-3",
                    email: "user3@example.com",
                    role: "admin",
                    tokenType: "access",
                },
            }),
        ).toBe(true);

        config.RATE_LIMIT_USER_KEYING_ENABLED = originalFlag;
    });

    it("skips authenticated ip ceiling for unauthenticated requests", () => {
        const originalFlag = config.RATE_LIMIT_USER_KEYING_ENABLED;
        config.RATE_LIMIT_USER_KEYING_ENABLED = true;

        expect(shouldSkipAuthenticatedIpCeiling({ auth: undefined })).toBe(true);

        config.RATE_LIMIT_USER_KEYING_ENABLED = originalFlag;
    });

    it("enforces authenticated ip ceiling for authenticated requests when enabled", () => {
        const originalFlag = config.RATE_LIMIT_USER_KEYING_ENABLED;
        config.RATE_LIMIT_USER_KEYING_ENABLED = true;

        expect(
            shouldSkipAuthenticatedIpCeiling({
                auth: {
                    userId: "user-4",
                    email: "user4@example.com",
                    role: "paid",
                    tokenType: "access",
                },
            }),
        ).toBe(false);

        config.RATE_LIMIT_USER_KEYING_ENABLED = originalFlag;
    });
});

describe("login attempt keying", () => {
    it("keys login attempts by normalized email and ip when email is present", () => {
        const key = getLoginAttemptLimiterKey({
            ip: "203.0.113.11",
            body: {
                email: "  USER@Example.com ",
            },
        });

        expect(key).toContain("login:user@example.com:");
        expect(key).toContain("ip:");
    });

    it("falls back to ip keying when login email is missing", () => {
        const key = getLoginAttemptLimiterKey({
            ip: "198.51.100.15",
            body: {},
        });

        expect(key).toContain("login:ip:");
    });
});
