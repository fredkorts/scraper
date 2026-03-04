import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { assertIsolatedTestDatabaseUrl } from "./database-target";

loadEnv({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

if (!testDatabaseUrl) {
    console.error("TEST_DATABASE_URL is required to migrate the backend test database.");
    process.exit(1);
}

assertIsolatedTestDatabaseUrl(testDatabaseUrl);

const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    {
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        stdio: "inherit",
        env: {
            ...process.env,
            DATABASE_URL: testDatabaseUrl,
        },
    },
);

if (result.status !== 0) {
    process.exit(result.status ?? 1);
}
