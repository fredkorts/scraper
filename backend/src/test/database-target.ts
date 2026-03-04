const SAFE_PLACEHOLDER_TEST_DATABASE_URL =
    "postgresql://test:test@invalid.invalid:5432/mabrik_scraper_test?schema=public";

const DEFAULT_ALLOWED_TEST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const TEST_DATABASE_NAME_SUFFIX = "_test";

interface ParsedDatabaseTarget {
    url: URL;
    host: string;
    databaseName: string;
}

const normalizeHost = (host: string) => host.trim().toLowerCase();

export const getSafePlaceholderTestDatabaseUrl = (): string => SAFE_PLACEHOLDER_TEST_DATABASE_URL;

export const parseDatabaseTarget = (urlString: string): ParsedDatabaseTarget => {
    const url = new URL(urlString);
    const databaseName = url.pathname.replace(/^\//, "");

    return {
        url,
        host: normalizeHost(url.hostname),
        databaseName,
    };
};

const getAllowedTestHosts = (): Set<string> => {
    const configuredHosts =
        process.env.TEST_DATABASE_HOST_ALLOWLIST
            ?.split(",")
            .map((host) => normalizeHost(host))
            .filter(Boolean) ?? [];

    return new Set([...DEFAULT_ALLOWED_TEST_HOSTS, ...configuredHosts]);
};

export const validateIsolatedTestDatabaseUrl = (urlString: string): string[] => {
    const errors: string[] = [];

    let target: ParsedDatabaseTarget;

    try {
        target = parseDatabaseTarget(urlString);
    } catch {
        return ["TEST_DATABASE_URL is not a valid database URL."];
    }

    const allowedHosts = getAllowedTestHosts();

    if (!target.databaseName) {
        errors.push("TEST_DATABASE_URL must include a database name.");
    }

    if (!target.databaseName.endsWith(TEST_DATABASE_NAME_SUFFIX)) {
        errors.push(`TEST_DATABASE_URL database name must end with ${TEST_DATABASE_NAME_SUFFIX}.`);
    }

    if (!allowedHosts.has(target.host)) {
        errors.push(
            `TEST_DATABASE_URL host must be local or explicitly allowlisted. Received host: ${target.host}.`,
        );
    }

    return errors;
};

export const assertIsolatedTestDatabaseUrl = (urlString: string): void => {
    const errors = validateIsolatedTestDatabaseUrl(urlString);

    if (errors.length > 0) {
        throw new Error(
            [
                "DB-backed backend tests require TEST_DATABASE_URL and it must point to an isolated local test database.",
                ...errors,
            ].join("\n"),
        );
    }
};

export const assertDbBackedTestEnvironment = (): void => {
    if (process.env.NODE_ENV !== "test") {
        throw new Error("DB-backed test helpers may only run when NODE_ENV=test.");
    }

    if (process.env.DB_BACKED_TESTS_ENABLED !== "true") {
        throw new Error(
            "DB-backed backend tests require TEST_DATABASE_URL. Configure it before running tests that use PostgreSQL.",
        );
    }

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL must be set before DB-backed test helpers run.");
    }

    assertIsolatedTestDatabaseUrl(process.env.DATABASE_URL);
};

