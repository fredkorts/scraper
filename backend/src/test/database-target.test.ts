import { describe, expect, it, vi } from "vitest";
import {
    assertDbBackedTestEnvironment,
    assertIsolatedTestDatabaseUrl,
    parseDatabaseTarget,
    validateIsolatedTestDatabaseUrl,
} from "./database-target";

describe("test database target helpers", () => {
    it("parses the database name from a PostgreSQL URL", () => {
        const target = parseDatabaseTarget(
            "postgresql://mabrik:mabrik@localhost:5432/mabrik_scraper_test?schema=public",
        );

        expect(target.host).toBe("localhost");
        expect(target.databaseName).toBe("mabrik_scraper_test");
    });

    it("rejects non-test database names", () => {
        expect(
            validateIsolatedTestDatabaseUrl(
                "postgresql://mabrik:mabrik@localhost:5432/mabrik_scraper?schema=public",
            ),
        ).toContain("TEST_DATABASE_URL database name must end with _test.");
    });

    it("rejects non-local hosts unless allowlisted", () => {
        expect(
            validateIsolatedTestDatabaseUrl(
                "postgresql://mabrik:mabrik@db.example.com:5432/mabrik_scraper_test?schema=public",
            ),
        ).toContain(
            "TEST_DATABASE_URL host must be local or explicitly allowlisted. Received host: db.example.com.",
        );
    });

    it("accepts allowlisted non-local hosts", () => {
        vi.stubEnv("TEST_DATABASE_HOST_ALLOWLIST", "db.example.com");

        expect(() =>
            assertIsolatedTestDatabaseUrl(
                "postgresql://mabrik:mabrik@db.example.com:5432/mabrik_scraper_test?schema=public",
            ),
        ).not.toThrow();
    });

    it("rejects DB-backed test helpers when the test database is not configured", () => {
        vi.stubEnv("NODE_ENV", "test");
        vi.stubEnv("DB_BACKED_TESTS_ENABLED", "false");
        vi.stubEnv(
            "DATABASE_URL",
            "postgresql://test:test@invalid.invalid:5432/mabrik_scraper_test?schema=public",
        );

        expect(() => assertDbBackedTestEnvironment()).toThrow(
            "DB-backed backend tests require TEST_DATABASE_URL.",
        );
    });
});
