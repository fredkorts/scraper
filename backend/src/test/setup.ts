import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import {
    assertIsolatedTestDatabaseUrl,
    getSafePlaceholderTestDatabaseUrl,
} from "./database-target";

loadEnv({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

process.env.NODE_ENV ??= "test";
process.env.PORT ??= "3001";
process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.SCHEDULER_CRON ??= "* * * * *";
process.env.SCRAPE_WORKER_CONCURRENCY ??= "1";
process.env.EMAIL_PROVIDER ??= "smtp";
process.env.EMAIL_FROM ??= "no-reply@example.com";
process.env.JWT_SECRET ??= "test-jwt-secret-that-is-at-least-32-chars";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-that-is-at-least-32-chars";
process.env.JWT_ISSUER ??= "mabrik-backend-test";
process.env.JWT_AUDIENCE ??= "mabrik-app-test";
process.env.ACCESS_TOKEN_TTL ??= "15m";
process.env.REFRESH_TOKEN_TTL_DAYS ??= "30";
process.env.BCRYPT_ROUNDS ??= "10";

const configuredTestDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

if (configuredTestDatabaseUrl) {
    assertIsolatedTestDatabaseUrl(configuredTestDatabaseUrl);
    process.env.DATABASE_URL = configuredTestDatabaseUrl;
    process.env.DB_BACKED_TESTS_ENABLED = "true";
} else {
    // Keep pure unit tests runnable without PostgreSQL while refusing DB-backed helpers later.
    process.env.DATABASE_URL = getSafePlaceholderTestDatabaseUrl();
    process.env.DB_BACKED_TESTS_ENABLED = "false";
}
