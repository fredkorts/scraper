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
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`

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
npm run seed --workspace=backend
npm run prisma:generate --workspace=backend
npm run prisma:studio --workspace=backend
```

Frontend:

```bash
npm run dev --workspace=frontend
npm run build --workspace=frontend
```

Shared:

```bash
npm run build --workspace=shared
```

## Backend Tests

The backend test suite uses Vitest and runs against the local PostgreSQL database.

Before running tests:

```bash
docker compose up -d db redis
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

Run backend tests:

```bash
npm run test --workspace=backend
```

The auth tests reset the auth-related tables before each run, so do not point `DATABASE_URL` at a database you want to preserve.

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
- category seed script
- local Docker setup for Postgres and Redis

Not implemented yet:

- payments
- dashboard application features

## Project Docs

- [REQUIREMENTS.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/REQUIREMENTS.md)
- [DB_IMPLEMENTATION.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/DB_IMPLEMENTATION.md)
