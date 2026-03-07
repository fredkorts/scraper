# Mabrik Scraper

Price-monitoring system for `mabrik.ee` with a Node/Express backend, PostgreSQL + Prisma data layer, and React/Vite dashboard.

## Workspace

This repo is an npm workspace monorepo:

- `backend`: Express API, Prisma schema, seed scripts
- `frontend`: React dashboard
- `shared`: shared types and constants

## Stack

- Backend: Node.js, Express, TypeScript, Prisma
- Database: PostgreSQL 16
- Queue/cache: Redis
- Frontend: React, Vite, TypeScript

## Requirements

- Node.js `20+`
- npm
- Docker Desktop or another working Docker daemon

## Environment

Copy `.env.example` to `.env` and set the values you want to use locally.

Required variables:

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `DATABASE_URL`
- `TEST_DATABASE_URL`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`

Phase 7 hardening variables (recommended):

- `LOG_LEVEL` (`debug|info|warn|error`)
- `TRUST_PROXY_HOPS` (set >0 behind reverse proxies)
- `RATE_LIMIT_REDIS_ENABLED` (`true` in production with Redis-backed limiter state)
- `SCRAPER_ADAPTIVE_DELAY_MAX_MS`
- `SCRAPER_ADAPTIVE_PENALTY_MS`
- `SCRAPER_RETRY_BUDGET_MS`
- `SCRAPER_ROBOTS_FETCH_TIMEOUT_MS`
- `SCRAPER_ROBOTS_CACHE_TTL_MS`
- `SCRAPER_ROBOTS_STRICT`

## Local Setup

Install dependencies:

```bash
npm install
```

Start Postgres and Redis:

```bash
docker compose up -d db redis
```

Apply migrations:

```bash
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

Seed category data:

```bash
DATABASE_URL='postgresql://mabrik:mabrik@localhost:5432/mabrik_scraper?schema=public' node --import tsx backend/prisma/seed.ts
```

Start the app:

```bash
npm run dev
```

This runs:

- backend on `http://localhost:3001`
- frontend on Vite's default local port

## Useful Commands

Root:

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run format
npm run format:check
```

## Code Quality Tooling

Repo-level tooling now includes:

1. ESLint (workspace linting for `frontend`, `backend`, and `shared`)
2. Prettier (repo-wide formatting)
3. Stylelint (frontend SCSS/CSS quality checks)
4. Husky + lint-staged (git hooks)

Git hooks:

1. `pre-commit`: runs staged lint/format checks via `lint-staged`
2. `pre-push`: runs `npm run lint`, `npm run typecheck`, and frontend tests

If hooks are missing after dependency install, run:

```bash
npm run prepare
```

Backend:

```bash
npm run dev --workspace=backend
npm run build --workspace=backend
npm run test --workspace=backend
npm run scrape:category --workspace=backend -- lauamangud
npm run scrape:cleanup-stale-runs --workspace=backend -- 30
npm run diff:run --workspace=backend -- <scrapeRunId>
npm run notify:immediate --workspace=backend -- <changeReportId>
npm run notify:digest --workspace=backend
npm run queue:worker --workspace=backend
npm run queue:scheduler --workspace=backend
npm run seed --workspace=backend
npm run categories:refresh --workspace=backend
npm run categories:refresh --workspace=backend -- --apply
npm run prisma:generate --workspace=backend
npm run prisma:studio --workspace=backend
```

Frontend:

```bash
npm run dev --workspace=frontend
npm run build --workspace=frontend
```

## Frontend Architecture Conventions

The frontend now follows a feature-first structure with separation by responsibility:

- `routes/*`: route composition and page assembly only
- `features/<feature>/components/*`: presentational UI sections
- `features/<feature>/hooks/*`: domain orchestration and derived view-model logic
- `features/<feature>/constants/*`: feature-scoped constants/labels
- `features/<feature>/types/*`: feature-scoped TypeScript types
- `shared/hooks/*`: reusable cross-feature hooks
- `shared/constants/*`: reusable cross-feature constants
- `shared/utils/*`: reusable cross-feature utilities

Rules of thumb:

- avoid putting complex business logic directly in route components
- extract repeated route-search/pagination behavior into shared hooks
- keep user-facing error messages normalized via shared utilities

Shared:

```bash
npm run build --workspace=shared
```

## Backend Tests

The backend test suite uses Vitest.

- pure unit tests can run without PostgreSQL
- DB-backed tests use a dedicated test database via `TEST_DATABASE_URL`

Before running tests:

```bash
docker compose up -d db redis
npx prisma migrate deploy --schema backend/prisma/schema.prisma
npm run test:db:migrate --workspace=backend
```

Run backend tests:

```bash
npm run test --workspace=backend
```

Run Redis-backed queue/scheduler integration tests as well:

```bash
RUN_REDIS_TESTS=1 npm run test --workspace=backend
```

Important:

- DB-backed backend tests truncate tables before each run
- they now target `TEST_DATABASE_URL`, not the development database
- do not point `TEST_DATABASE_URL` at any database you want to preserve
- the recommended local test DB is `mabrik_scraper_test`

If the test database does not exist yet, create it once inside the local Postgres container:

```bash
docker exec -it mabrik-postgres psql -U mabrik -d postgres -c "CREATE DATABASE mabrik_scraper_test;"
```

## Local Notification Testing

For local notification testing, you can keep `EMAIL_PROVIDER=smtp` and either:

- point SMTP at a local mail catcher such as MailHog or Mailpit
- or leave `SMTP_HOST` / `SMTP_PORT` unset and let Nodemailer fall back to `jsonTransport`

Example mail catcher setup:

```bash
docker run --rm -p 1025:1025 -p 8025:8025 axllent/mailpit
```

Then use:

```bash
EMAIL_PROVIDER=smtp
EMAIL_FROM=no-reply@example.com
SMTP_HOST=localhost
SMTP_PORT=1025
```

Immediate flow:

1. Run a scrape that creates a `change_report`
2. Copy the `changeReportId`
3. Trigger the immediate sender:

```bash
npm run notify:immediate --workspace=backend -- <changeReportId>
```

Digest flow:

1. Ensure there are pending free-user deliveries in the database
2. Run the digest sender:

```bash
npm run notify:digest --workspace=backend
```

Useful companion commands:

```bash
npm run scrape:category --workspace=backend -- lauamangud
npm run diff:run --workspace=backend -- <scrapeRunId>
```

If you use Mailpit, inspect sent emails at `http://localhost:8025`.

## Database Notes

Prisma schema:

- [schema.prisma](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/prisma/schema.prisma)

Category seed:

- [seed.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/prisma/seed.ts)

Local services:

- [docker-compose.yml](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/docker-compose.yml)

If the initial schema is ever applied manually from SQL instead of through Prisma Migrate, baseline that migration before running `prisma migrate deploy`:

```bash
npx prisma migrate resolve --applied 20260301000000_init --schema backend/prisma/schema.prisma
```

Without that step, Prisma will fail with `P3005` because the database schema is non-empty but Prisma does not yet have matching migration history in `_prisma_migrations`.

To mark abandoned `RUNNING` scraper jobs as failed, use:

```bash
DATABASE_URL='postgresql://mabrik:mabrik@localhost:5432/mabrik_scraper?schema=public' npm run scrape:cleanup-stale-runs --workspace=backend -- 30
```

The trailing argument is the stale threshold in minutes. If omitted, the script defaults to `30`.

## Current Status

Implemented foundation:

- monorepo workspace structure
- backend Prisma integration
- PostgreSQL schema and initial migration
- auth endpoints and auth test suite
- basic scraper module
- live scraper verification against a real seeded category
- diff engine, canonical change reports, and notification deliveries
- email templates, immediate paid sends, and free-user digest job
- BullMQ scrape queue and node-cron scheduler based on `categories.next_run_at`
- category seed script
- local Docker setup for Postgres and Redis

Not implemented yet:

- payments
- dashboard application features

## Project Docs

- [REQUIREMENTS.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/documentation/backend/REQUIREMENTS.md)
- [DB_IMPLEMENTATION.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/documentation/backend/DB_IMPLEMENTATION.md)
