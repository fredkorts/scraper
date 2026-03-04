# Test Database Isolation Implementation Plan

## Status

Implemented on March 4, 2026.

Delivered:

- DB-backed backend tests now load `TEST_DATABASE_URL` from [backend/.env](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/.env)
- backend test bootstrap no longer defaults to the dev database
- destructive DB test helpers assert `NODE_ENV=test`, `DB_BACKED_TESTS_ENABLED=true`, a local/allowlisted host, and a database name ending in `_test`
- added a dedicated test DB migration script in [backend/package.json](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/package.json)
- README and repo rules now document the isolated test DB workflow

## Summary

Backend integration and route tests must stop using the normal local development database. Right now, Vitest defaults `DATABASE_URL` to the same `mabrik_scraper` database used by local development, and the shared test helper truncates tables before each test. That is how seeded Mabrik categories were deleted and replaced with test data.

The fix is to introduce a dedicated test database path and make destructive test helpers run only against that database.

## Problem Statement

Current behavior:

- [backend/src/test/setup.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/test/setup.ts) sets `DATABASE_URL` to `postgresql://mabrik:mabrik@localhost:5432/mabrik_scraper?schema=public`
- [backend/src/test/db.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/test/db.ts) truncates core tables before each DB-backed test
- DB-backed tests create their own categories, users, runs, and channels

Result:

- running backend tests destroys local dev data
- seeded Mabrik categories disappear
- test data leaks into the app UI
- developers cannot safely run tests against a working local app environment

This is a hard test isolation flaw, not just a documentation issue.

## Goals

1. DB-backed backend tests use a dedicated PostgreSQL database, never the dev database.
2. The DB-backed test bootstrap fails fast if test DB isolation is not configured.
3. Local development commands keep using the current dev database.
4. Test setup remains simple enough for local use and CI.
5. Documentation clearly separates dev DB and test DB commands.

## Non-Goals

1. Replacing Prisma or the current Vitest setup.
2. Running tests against ephemeral in-memory databases.
3. Fully redesigning all test helpers in this phase.
4. Changing application runtime DB behavior outside test execution.

## Recommended Design

Use a dedicated environment variable:

- `TEST_DATABASE_URL`

And make the backend test bootstrap do this:

1. for DB-backed backend tests, require `TEST_DATABASE_URL`
2. set `process.env.DATABASE_URL = process.env.TEST_DATABASE_URL`
3. refuse to run if `TEST_DATABASE_URL` is missing
4. parse and validate the target database instead of comparing raw URL strings
5. refuse to run unless the database name includes a test marker such as `_test`
6. refuse destructive test helpers unless the target host is local or explicitly allowlisted

Recommended DB names:

- dev: `mabrik_scraper`
- test: `mabrik_scraper_test`

Recommended URLs:

```env
DATABASE_URL=postgresql://mabrik:mabrik@localhost:5432/mabrik_scraper?schema=public
TEST_DATABASE_URL=postgresql://mabrik:mabrik@localhost:5432/mabrik_scraper_test?schema=public
```

## Why This Approach

This is the smallest correct solution because:

- Prisma already relies on `DATABASE_URL`
- existing app code can stay unchanged
- tests only need one bootstrap redirection point
- truncation-based test cleanup can continue safely once it points at the correct DB

It is better than relying on “be careful” documentation because destructive tests will still eventually hit the wrong database.

It also avoids overconstraining pure unit tests that do not touch Prisma or PostgreSQL.

## Implementation Plan

### Phase 1: Environment Separation

Update the DB-backed backend test bootstrap so tests no longer default to the dev DB.

Required changes:

1. [backend/src/test/setup.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/test/setup.ts)
   - stop defaulting `DATABASE_URL` to `mabrik_scraper`
   - read `TEST_DATABASE_URL`
   - assign `DATABASE_URL = TEST_DATABASE_URL`
   - throw a clear startup error if missing

2. Add guard logic:
   - parse `TEST_DATABASE_URL` and validate the target instead of comparing raw strings
   - fail if parsed DB name does not look like a test DB
   - fail if host is not local or allowlisted for test execution
   - fail if `NODE_ENV !== "test"` in destructive DB-backed test helpers

Recommended error message:

```text
DB-backed backend tests require TEST_DATABASE_URL and it must point to an isolated local test database, not the development database.
```

### Phase 2: Test Database Provisioning

Create a predictable local test DB that developers can start easily.

Options:

1. Recommended:
   - use the same Postgres container
   - create a second database inside it: `mabrik_scraper_test`

2. Alternative:
   - second Postgres container dedicated to tests

Recommendation:

- use the same container with a second database

Why:

- lower operational overhead
- simpler local setup
- enough isolation for this project

Required work:

1. create `mabrik_scraper_test`
2. run Prisma migrations against the test DB
3. do not seed Mabrik category data into the test DB by default unless a specific test needs it

### Phase 3: Test Commands

Make test commands explicit and safe.

Recommended backend package scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:db:migrate": "DATABASE_URL=$TEST_DATABASE_URL prisma migrate deploy --schema prisma/schema.prisma"
}
```

If shell portability becomes an issue, use a small Node or shell wrapper instead of inline env expansion.

Important rule:

- DB-backed tests should be impossible to run successfully without `TEST_DATABASE_URL`
- pure unit tests should remain runnable without PostgreSQL

### Phase 4: Safety Checks in Test Helpers

Strengthen [backend/src/test/db.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/test/db.ts).

Add a runtime assertion before truncation:

- read the active `DATABASE_URL`
- parse the database name
- parse the host
- fail if `NODE_ENV !== "test"`
- fail if the host is not local or allowlisted
- fail if the DB name does not match the expected test DB naming rule

This is a second safety net in case bootstrap setup regresses later.

Example policy:

- allowed database names must end with `_test`
- allowed hosts should be limited to `localhost`, `127.0.0.1`, or an explicit test allowlist

### Phase 5: Bootstrap Order Guarantee

This repo constructs `PrismaClient` at module load time in [backend/src/lib/prisma.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/lib/prisma.ts). That means test DB rewriting must happen before any DB-backed test imports code paths that touch Prisma.

Required guarantees:

1. the earliest DB-backed test bootstrap sets `DATABASE_URL` from `TEST_DATABASE_URL`
2. no DB-backed test helper imports Prisma before bootstrap runs
3. at least one automated test proves the effective database name under Vitest is the intended test DB

This is an implementation invariant, not an optional cleanup.

## Developer Experience Flow

Recommended local workflow:

1. start Postgres/Redis
2. ensure both `mabrik_scraper` and `mabrik_scraper_test` exist
3. run migrations for dev DB
4. run migrations for test DB
5. seed only the dev DB unless a test explicitly needs seed data
6. run DB-backed backend tests with `TEST_DATABASE_URL` configured
7. keep pure unit tests runnable without PostgreSQL

Example:

```bash
docker compose up -d db redis

DATABASE_URL='postgresql://mabrik:mabrik@localhost:5432/mabrik_scraper?schema=public' \
npx prisma migrate deploy --schema backend/prisma/schema.prisma

DATABASE_URL='postgresql://mabrik:mabrik@localhost:5432/mabrik_scraper_test?schema=public' \
npx prisma migrate deploy --schema backend/prisma/schema.prisma

npm run test --workspace=backend
```

## CI Strategy

CI should also use `TEST_DATABASE_URL`, not `DATABASE_URL`, for DB-backed backend tests.

Recommended flow:

1. start Postgres service
2. create test database
3. set `TEST_DATABASE_URL`
4. migrate test DB
5. run backend tests

The key is consistency between local and CI behavior.

## Security and Safety Requirements

1. DB-backed test bootstrap must never silently fall back to the dev DB.
2. Destructive test cleanup must verify it is running against a test-only DB.
3. No production, staging, or non-local URL should ever be accepted by the destructive DB test setup.
4. Docs must stop suggesting that `DATABASE_URL` can safely point at a preservable local DB during tests.

This is mostly a safety and operational integrity issue rather than an external security issue, but it matters because test code is intentionally destructive.

## Required File Changes

### Backend

- [backend/src/test/setup.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/test/setup.ts)
- [backend/src/test/db.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/test/db.ts)
- [backend/package.json](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/package.json) if new scripts are added

### Environment / Docs

- [backend/.env](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/.env)
- [README.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/README.md)
- optionally [AGENTS.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/AGENTS.md) to codify the rule that DB-backed tests must use `TEST_DATABASE_URL`

## Testing Plan

### Automated

1. backend tests fail immediately when `TEST_DATABASE_URL` is missing
2. DB-backed tests fail immediately when `TEST_DATABASE_URL` points to a non-test DB name
3. DB-backed tests fail immediately when `TEST_DATABASE_URL` points to a non-local or non-allowlisted host
4. DB-backed tests pass when `TEST_DATABASE_URL` points to `mabrik_scraper_test`
5. truncation helper runs only against the test DB
6. pure unit tests still run without `TEST_DATABASE_URL`

### Manual

1. seed dev DB with Mabrik categories
2. run backend test suite
3. confirm dev DB still contains seeded categories
4. confirm test DB contains only transient test data

## Acceptance Criteria

This work is complete when:

1. running DB-backed backend tests can no longer truncate the development database
2. `TEST_DATABASE_URL` is required for DB-backed backend tests
3. DB-backed test bootstrap rejects non-test, non-local database targets
4. pure unit tests still run without PostgreSQL
5. docs clearly explain how to migrate and use the test DB
6. reseeding the dev DB is no longer necessary after running DB-backed tests

## Recommended Implementation Order

1. add `TEST_DATABASE_URL` handling in the DB-backed backend test bootstrap
2. add truncation guard in `backend/src/test/db.ts`
3. add bootstrap-order protection so Prisma never initializes before test DB assignment
4. create the local `mabrik_scraper_test` database
5. add migration/test scripts for test DB workflow
6. update README and any repo rules
7. manually prove that dev categories survive a full DB-backed backend test run

## Recommended Default Decisions

1. one Postgres container, two databases
2. `TEST_DATABASE_URL` required for DB-backed backend tests
3. fail fast if the DB name does not end with `_test`
4. fail fast if the target host is not local or explicitly allowlisted
5. no category seeding in the test DB by default
6. keep truncation-based cleanup for now, but only after isolation is enforced
