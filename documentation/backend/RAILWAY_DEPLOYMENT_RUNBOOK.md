# Railway Deployment Runbook (Monorepo)

## Status

Planned (provider selected: Railway).

## Objective

Deploy this single-repo project to Railway using separate backend services:

1. `backend-api`
2. `backend-worker`
3. `backend-scheduler`

Frontend stays on Vercel per current architecture decision.

## Vercel Monorepo Note

If Vercel build fails on Husky during dependency install:

1. set `HUSKY=0` in Vercel environment variables
2. keep frontend build command:
    - `npm ci && npm run build --workspace=shared && npm run build --workspace=frontend`

This prevents git-hook bootstrap in CI while preserving local Husky hooks.

## Service Architecture on Railway

Create one Railway project and three services from the same repository/branch:

1. `backend-api` (Express HTTP API)
2. `backend-worker` (Bull queue consumer)
3. `backend-scheduler` (node-cron enqueuer)

Use the same repo root for all three services and different start commands.

## Build and Start Commands

For all three services:

1. Build command:
    - `npm ci`

Service-specific start commands:

1. `backend-api`:
    - `npm run start:runtime --workspace=backend`
2. `backend-worker`:
    - `npm run queue:worker --workspace=backend`
3. `backend-scheduler`:
    - `npm run queue:scheduler --workspace=backend`

## Required Environment Variables

Set these in Railway for all backend services unless noted:

1. `NODE_ENV=production`
2. `DATABASE_URL=<production postgres url>`
3. `REDIS_URL=<production redis url>`
4. `FRONTEND_URL=<https://your-frontend-domain>`
5. `JWT_SECRET=<32+ chars>`
6. `JWT_REFRESH_SECRET=<32+ chars>`
7. `EMAIL_PROVIDER=smtp|resend`
8. `EMAIL_FROM=<verified sender>`
9. `PORT=3001` (API service only; Railway may inject this automatically)

If using SMTP:

1. `SMTP_HOST`
2. `SMTP_PORT`
3. `SMTP_USER`
4. `SMTP_PASS`

If using Resend:

1. `RESEND_API_KEY`

Recommended production hardening vars:

1. `TRUST_PROXY_HOPS=1`
2. `RATE_LIMIT_REDIS_ENABLED=true`
3. `LOG_LEVEL=info`

## Database Migration Strategy on Railway

Preferred approach:

1. Run migrations from CI before or immediately after backend deploy:
    - `npx prisma migrate deploy --schema backend/prisma/schema.prisma`
2. Seed reference data once:
    - `npm run seed --workspace=backend`

Do not run `prisma migrate dev` in production.

## Deployment Sequence

1. Provision Postgres and Redis (Railway managed or external services).
2. Create backend services and set env vars.
3. Deploy `backend-api`.
4. Run production migrations.
5. Deploy `backend-worker`.
6. Deploy `backend-scheduler`.
7. Validate:
    - `GET /api/health` returns `status: ok`
    - scheduler logs show enqueue ticks
    - worker logs show queue readiness

## Smoke Test Checklist

1. Register/login succeeds via frontend.
2. Manual admin scrape trigger enqueues a job.
3. Worker processes job and creates a scrape run.
4. Dashboard shows new run.
5. Notifications path executes without runtime errors.

## Common Failure Modes

1. Missing `DATABASE_URL` / `REDIS_URL`:
    - startup fails in config validation.
2. CORS mismatch (`FRONTEND_URL`):
    - browser auth/session calls fail.
3. Scheduler running but no worker:
    - queue grows, runs never execute.
4. Worker running but scheduler down:
    - no scheduled jobs enter queue.

## Rollback

1. Re-deploy previous known-good commit for all three backend services.
2. Keep DB migration rollback manual and explicit (no destructive auto-rollback).
3. If issue is worker-only, rollback worker first without touching API.
