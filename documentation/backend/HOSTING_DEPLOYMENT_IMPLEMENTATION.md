# Hosting & Deployment Implementation Plan

## Status

In progress (backend provider selected: Railway).

## Goal

Deploy the monorepo to production so users can access:

1. frontend dashboard
2. backend API
3. background scraping and scheduling services

while keeping a single Git repository and predictable operational behavior.

## Recommended Production Topology (Single-Repo, Multi-Service)

Use one repo, but deploy multiple services from it:

1. `frontend` (React/Vite static app) -> Vercel
2. `backend-api` (Express API) -> container service on VPS or managed runtime
3. `backend-worker` (Bull worker) -> separate process/service
4. `backend-scheduler` (node-cron enqueue process) -> separate process/service
5. `postgres` -> managed Postgres (Neon)
6. `redis` -> managed Redis (Upstash/Redis Cloud) or VPS Redis

This preserves isolation and avoids API restarts breaking worker/scheduler jobs.

## Why Multi-Service Even in One Repo

Single repo does not mean single runtime process.

We need independent scaling and reliability for:

1. request/response API traffic
2. long-running scrape jobs
3. scheduling loop

If all run in one process, crashes and deploys are riskier and debugging is harder.

## Provider Strategy (Aligned with Current Project Direction)

Current decision for execution:

1. Frontend: Vercel
2. API/worker/scheduler: Railway as three services
3. Postgres/Redis: managed services (Railway or external managed providers)

Runbook:

1. [RAILWAY_DEPLOYMENT_RUNBOOK.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/documentation/backend/RAILWAY_DEPLOYMENT_RUNBOOK.md)
2. Backend Dockerfile for Railway services:
    - [Dockerfile.backend](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/Dockerfile.backend)

## Monorepo Deployment Model

Each deploy target points to the same repository and branch.

### Frontend target

1. Root directory: `frontend`
2. Build command: `npm ci && npm run build --workspace=shared && npm run build --workspace=frontend`
3. Output directory: `frontend/dist`
4. Runtime env:
    - `VITE_API_URL`

### Backend API target

1. Build command: `npm ci && npm run build --workspace=shared && npm run build --workspace=backend`
2. Start command: `npm run start --workspace=backend`
3. Runtime env:
    - `NODE_ENV=production`
    - `PORT`
    - `DATABASE_URL`
    - `REDIS_URL`
    - `JWT_SECRET`
    - `JWT_REFRESH_SECRET`
    - `FRONTEND_URL`
    - notification provider env vars

### Backend worker target

1. Build command: same as backend API
2. Start command: `npm run queue:worker --workspace=backend`
3. Runtime env: same DB/Redis/auth/email env set as API where relevant

### Backend scheduler target

1. Build command: same as backend API
2. Start command: `npm run queue:scheduler --workspace=backend`
3. Runtime env: same DB/Redis env as API

## Deployment Prerequisites

1. Production database provisioned (Neon)
2. Production Redis provisioned
3. DNS configured:
    - `app.<domain>` -> frontend
    - `api.<domain>` -> backend API
4. HTTPS enabled on all public endpoints
5. CORS set to production frontend origin only
6. Secure secrets generated and stored in provider secret manager

## Database and Migration Strategy

1. Run `prisma migrate deploy` during each backend release before new code serves traffic.
2. Seed only reference data in production (`categories`, static metadata).
3. Never run destructive reset commands in production.
4. Keep `TEST_DATABASE_URL` isolated from production and not set in production environments.

## CI/CD Plan (GitHub Actions)

Create one pipeline with path-based jobs:

1. `frontend` changed -> lint/test/build frontend + shared
2. `backend` changed -> lint/test/build backend + shared
3. infra/deploy files changed -> run deployment workflow

Deployment stages:

1. Verify (lint/typecheck/tests/build)
2. Deploy backend API
3. Run migrations
4. Deploy worker and scheduler
5. Deploy frontend
6. Smoke checks

## Release and Rollback Strategy

1. Use immutable releases (commit SHA tags/images).
2. Keep previous release artifact for quick rollback.
3. Rollback order:
    - frontend rollback (if UI-only issue)
    - backend rollback
    - worker/scheduler rollback
4. If migration is backward-incompatible, gate rollout with explicit migration plan and downtime window.

## Observability and Operations

Minimum production observability:

1. structured logs centralized by service (`api`, `worker`, `scheduler`)
2. health endpoint for API
3. queue depth and failed job monitoring
4. error alerting (Sentry/Logtail/Grafana stack)
5. uptime checks for API and frontend

## Security Baseline

1. enforce HTTPS and secure cookies in production
2. strict CORS to frontend domain
3. Redis and Postgres not publicly exposed unless required
4. rate limits enabled in production mode
5. rotate JWT secrets and mail provider keys on schedule
6. dependency automation enabled (Renovate)

## Go-Live Checklist

1. production env vars configured for all three backend services
2. API responds and can access DB/Redis
3. scheduler enqueues jobs
4. worker consumes jobs
5. scrape run appears in dashboard
6. diff generation and notification delivery verified
7. backups and restore procedure tested once
8. alerting and log access verified

## Implementation Phases

### Phase 1: Infrastructure baseline

1. provision Neon + Redis + frontend hosting + backend runtime
2. configure DNS and TLS
3. set production secrets

### Phase 2: Service deployment

1. deploy API
2. deploy worker
3. deploy scheduler
4. run migrations and seed

### Phase 3: Automation and hardening

1. add CI/CD pipeline with environment protections
2. add smoke tests post-deploy
3. set rollback playbook and on-call runbook

## Acceptance Criteria

1. users can access frontend over HTTPS
2. authenticated users can call production API successfully
3. scheduled scraping runs automatically without manual commands
4. worker processes queued jobs continuously
5. migrations are automated in release process
6. logs/alerts allow rapid issue triage
7. rollback path is documented and tested at least once
