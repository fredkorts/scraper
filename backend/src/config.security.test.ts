import { describe, expect, it } from "vitest";
import { parseConfigFromEnv } from "./config";

const baseEnv = (): NodeJS.ProcessEnv => ({
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://mabrik:mabrik@localhost:5432/mabrik_scraper?schema=public",
    FRONTEND_URL: "http://localhost:5173",
    JWT_SECRET: "dev-jwt-secret-4d3f2a1b9c8e7d6f5a4b3c2d1e0f1234",
    JWT_REFRESH_SECRET: "dev-refresh-secret-9f8e7d6c5b4a3f2e1d0c9b8a7f6e5432",
});

describe("security config validation", () => {
    it("rejects placeholder JWT secrets outside test mode", () => {
        const env = {
            ...baseEnv(),
            JWT_SECRET: "replace-with-a-long-random-string-of-at-least-32-characters",
        };

        expect(() => parseConfigFromEnv(env)).toThrow();
    });

    it("allows placeholder-style fixtures in test mode", () => {
        const env = {
            ...baseEnv(),
            NODE_ENV: "test",
            JWT_SECRET: "replace-with-a-long-random-string-of-at-least-32-characters",
            JWT_REFRESH_SECRET: "replace-with-a-different-long-random-string-of-at-least-32-characters",
        };

        expect(() => parseConfigFromEnv(env)).not.toThrow();
    });

    it("requires secure/auth Redis in production while allowing railway internal redis://", () => {
        const insecureProtocolEnv = {
            ...baseEnv(),
            NODE_ENV: "production",
            REDIS_URL: "redis://localhost:6379",
        };
        const railwayInternalEnv = {
            ...baseEnv(),
            NODE_ENV: "production",
            REDIS_URL: "redis://default:strongpass@redis.railway.internal:6379/0",
        };
        const missingAuthEnv = {
            ...baseEnv(),
            NODE_ENV: "production",
            REDIS_URL: "rediss://localhost:6379",
        };
        const secureEnv = {
            ...baseEnv(),
            NODE_ENV: "production",
            REDIS_URL: "rediss://mabrik:strongpass@localhost:6379/0",
        };

        expect(() => parseConfigFromEnv(insecureProtocolEnv)).toThrow();
        expect(() => parseConfigFromEnv(railwayInternalEnv)).not.toThrow();
        expect(() => parseConfigFromEnv(missingAuthEnv)).toThrow();
        expect(() => parseConfigFromEnv(secureEnv)).not.toThrow();
    });

    it("requires jwt key rotation config to include active kid and keyset entry", () => {
        const missingActiveKid = {
            ...baseEnv(),
            AUTH_JWT_KEYS_JSON: JSON.stringify({
                active: "active-secret-key-with-at-least-32-characters",
            }),
        };
        const missingKeyEntry = {
            ...baseEnv(),
            AUTH_JWT_ACTIVE_KID: "active",
            AUTH_JWT_KEYS_JSON: JSON.stringify({
                previous: "previous-secret-key-with-at-least-32-chars",
            }),
        };
        const valid = {
            ...baseEnv(),
            AUTH_JWT_ACTIVE_KID: "active",
            AUTH_JWT_KEYS_JSON: JSON.stringify({
                active: "active-secret-key-with-at-least-32-characters",
                previous: "previous-secret-key-with-at-least-32-chars",
            }),
        };

        expect(() => parseConfigFromEnv(missingActiveKid)).toThrow();
        expect(() => parseConfigFromEnv(missingKeyEntry)).toThrow();
        expect(() => parseConfigFromEnv(valid)).not.toThrow();
    });
});
