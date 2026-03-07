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

Vercel must run from repo root for npm workspaces to resolve correctly.

Required Vercel project settings:

1. Root Directory: `.` (repo root, not `frontend`)
2. Install Command: `npm ci`
3. Build Command: `npm run build --workspace=shared && npm run build --workspace=frontend`
4. Output Directory: `frontend/dist`
5. Environment variable: `HUSKY=0`

If Root Directory is set to `frontend`, commands using `--workspace=shared` fail with:

1. `npm error No workspaces found: --workspace=shared`

## Service Architecture on Railway

Create one Railway project and three services from the same repository/branch:

1. `backend-api` (Express HTTP API)
2. `backend-worker` (Bull queue consumer)
3. `backend-scheduler` (node-cron enqueuer)

Use the same repo root for all three services and different start commands.

## Backend Build Mode (Recommended)

Use Dockerfile deployment for backend services to avoid Railpack workspace edge cases:

1. Dockerfile path: `Dockerfile.backend`
2. Build context: repo root
3. Service start command override:
    - `backend-api`: `npm run start:runtime --workspace=backend`
    - `backend-worker`: `npm run queue:worker --workspace=backend`
    - `backend-scheduler`: `npm run queue:scheduler --workspace=backend`

This avoids repeated auto-install phases that can trigger `EBUSY` errors on frontend cache folders.

## Build and Start Commands (If staying on Railpack/Nixpacks)

For all three services:

1. Build command:
    - `npm ci --include=dev --workspace=shared --workspace=backend`

Service-specific start commands:

1. `backend-api`:
    - `npm run start:runtime --workspace=backend`
2. `backend-worker`:
    - `npm run queue:worker --workspace=backend`
3. `backend-scheduler`:
    - `npm run queue:scheduler --workspace=backend`

Why this install command:

1. installs only required workspaces for backend services (`shared` + `backend`)
2. avoids touching `frontend/node_modules` in backend builds
3. keeps `tsx` available (backend currently starts with tsx scripts)

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
5. Build fails with `EBUSY ... frontend/node_modules/.vite` during `npm ci`:
    - switch to backend-only workspace install command
    - clear Railway build cache and redeploy
    - if persistent, switch service to Dockerfile mode (`Dockerfile.backend`)

## Rollback

1. Re-deploy previous known-good commit for all three backend services.
2. Keep DB migration rollback manual and explicit (no destructive auto-rollback).
3. If issue is worker-only, rollback worker first without touching API.

## Railway Build Cache Recovery

If backend service build cache causes lock/busy install failures:

1. open service settings/deployments
2. clear build cache
3. redeploy latest commit
4. confirm build command is backend-only workspace install (not plain root `npm ci`)
