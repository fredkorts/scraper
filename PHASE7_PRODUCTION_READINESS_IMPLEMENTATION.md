# Phase 7 Production Readiness Implementation Plan

## Scope

This plan covers only these Phase 7 goals:

1. Add rate limiting to API endpoints
2. Add scraper politeness features (`robots.txt`, adaptive delays)
3. Implement stronger error handling and retry logic for failed scrapes
4. Add structured logging (choose Pino)

Payments (Phase 6) is intentionally deferred.

Execution baseline:

- single worker deployment for now (multi-worker scaling deferred)

## Locked Operational Decisions

1. Limiter store outage policy:
   - fail-open for public read endpoints
   - fail-closed for auth/admin mutation paths
2. Worker model:
   - single worker for now
   - keep implementation compatible with future multi-worker scaling
3. Retry budget:
   - enforce a per-category cumulative retry wall-clock budget
   - recommended default: `SCRAPER_RETRY_BUDGET_MS=900000` (15 minutes)

## Current State (as of March 4, 2026)

- API already uses `express-rate-limit` in [backend/src/app.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/app.ts) with in-memory stores.
- Scraper already has:
  - per-page random delay (`SCRAPER_MIN_DELAY_MS` / `SCRAPER_MAX_DELAY_MS`)
  - per-request retry with exponential backoff in [backend/src/scraper/fetch.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/fetch.ts)
  - queue-level retry attempts in [backend/src/queue/enqueue.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/queue/enqueue.ts)
  - failure classification in [backend/src/scraper/failure.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/failure.ts)
- Logging is currently `console.log` / `console.error` across API, worker, scheduler, and CLI scripts.

## Target Architecture Decisions

### 1) Rate Limiting

Use layered limiters:

- **Global API limiter** (`/api/*`): broad protection for abusive clients.
- **Auth limiter** (`/api/auth/*`): strict budgets for brute-force protection.
- **High-cost read limiter** (`/api/runs`, `/api/products`): moderate per-user budgets.
- **Admin action limiter** (`/api/runs/trigger`, category settings updates): strict mutation budgets.

Implementation decisions:

- Keep `express-rate-limit`.
- Add Redis-backed store for limiter state in non-test environments (horizontal-safe).
- Keep high test limits in `NODE_ENV=test`.
- Configure trusted proxy hops explicitly (for correct client IP extraction behind reverse proxy).
- Key strategy:
  - unauthenticated routes: client IP
  - authenticated routes: `userId` fallback to IP
- Limiter-store outage behavior:
  - public read endpoints: fail-open with warning logs/metrics
  - auth/admin mutation endpoints: fail-closed with 503 and explicit error code
- Return consistent 429 payload:
  - `error: "rate_limit_exceeded"`
  - `message`
  - optional `retryAfterSeconds`

## 2) Scraper Politeness (`robots.txt` + Adaptive Delays)

### `robots.txt` policy

Add a `robots` policy service:

- fetch and parse `${SCRAPER_BASE_URL}/robots.txt`
- cache result in memory with TTL (example: 6h); this is acceptable for single-worker baseline
- validate category page URLs against `SCRAPER_USER_AGENT`
- if disallowed:
  - abort scrape before page fetch loop
  - record failure code `robots_disallowed`
  - mark non-retryable

Failure mode for robots fetch:

- add config `SCRAPER_ROBOTS_STRICT`
  - `true` (recommended for prod): fail closed if robots cannot be validated
  - `false` (allowed for local dev): log warning and continue
- add last-known-good fallback:
  - if robots fetch fails but cached policy is still valid, continue using cached policy
  - if no valid cached policy exists and strict mode is enabled, fail closed
- add robots fetch timeout budget to prevent indefinite startup stalls

### Adaptive delays

Extend fixed random delay into adaptive delay:

- base delay from existing min/max config
- extra penalty after transient upstream pressure signals:
  - 429 responses
  - 5xx spikes
  - repeated timeouts
- honor `Retry-After` header when present
- cap adaptive delay to a max configured ceiling

New config candidates:

- `SCRAPER_ROBOTS_CACHE_TTL_MS`
- `SCRAPER_ROBOTS_STRICT`
- `SCRAPER_ADAPTIVE_DELAY_MAX_MS`
- `SCRAPER_ADAPTIVE_PENALTY_MS`

## 3) Error Handling and Retry Logic

Current retries are good but need orchestration to avoid retry storms.

### Retry model

Use two-level retries with clear boundaries:

1. **HTTP/page retry** (inside scraper fetch): transient network/upstream failures
2. **Job retry** (BullMQ attempts): transient run-level failures

Enhancements:

- add jitter to fetch backoff (reduce synchronized retries)
- classify retryability from `mapScrapeFailure`
- in worker, suppress queue retries for non-retryable failures (`job.discard()` pattern)
- keep queue retries for retryable failures only
- enforce cumulative retry budget per category run (`SCRAPER_RETRY_BUDGET_MS`)
  - once exhausted, mark failure code `retry_budget_exhausted`
  - treat as non-retryable for the remaining queue attempts
- persist attempt metadata to logs for each failure

### Error boundary improvements

- normalize thrown scraper errors into typed failure objects at service boundaries
- ensure API responses never expose internal stack traces
- keep technical details admin-only (already aligned with current run-detail behavior)

## 4) Logging (Pino)

Choose **Pino** for structured JSON logs and lower overhead.

Implementation decisions:

- create shared logger in `backend/src/lib/logger.ts`
- replace `console.*` calls in:
  - API app/server
  - scheduler
  - worker
  - scraper/diff/notification scripts
- request logging middleware:
  - request id (`x-request-id` accepted or generated)
  - method, path, status, latency
  - actor id if authenticated
- child loggers for worker jobs and scrape runs:
  - `jobId`, `categoryId`, `scrapeRunId`, `attempt`, `trigger`
- correlation id propagation:
  - accept or generate request id at API edge
  - propagate into queued job metadata and worker log context
- redaction policy for sensitive fields:
  - auth cookies, JWTs, passwords, secrets, SMTP/Resend creds

Dev/prod behavior:

- dev: pretty logs via transport (human-readable)
- prod: JSON logs for ingestion

## Implementation Sequence

1. Introduce logger foundation (Pino + request middleware + redaction).
2. Migrate existing `console.*` to logger calls.
3. Refactor API limiter setup into route-scoped limiter modules.
4. Add Redis-backed limiter store for non-test environments.
5. Implement limiter-store outage behavior (fail-open/fail-closed split by endpoint class).
6. Add robots policy service, strict-mode config, timeout, and last-known-good fallback.
7. Add adaptive delay manager and `Retry-After` handling.
8. Refine worker retry behavior with retryable/non-retryable branching and retry budget cutoff.
9. Add tests and update docs/env templates.

## Testing Plan

### Rate limiting

- integration tests for 429 behavior on auth and trigger routes
- verify authenticated keying (same IP, different users)
- verify bypass/high limits in `NODE_ENV=test`
- verify limiter-store outage behavior:
  - read endpoints fail-open
  - auth/admin mutation endpoints fail-closed

### Robots + politeness

- unit tests for robots parser allow/deny decisions
- unit tests for robots cache TTL refresh behavior
- tests for strict vs non-strict robots failure mode
- tests for adaptive delay increase/decrease and max cap
- tests for robots last-known-good fallback and fetch timeout

### Retry/error handling

- fetch retry tests with jitter-aware assertions
- worker tests:
  - non-retryable failure is not retried
  - retryable failure retries until attempts exhausted
- retry budget tests:
  - budget exhausted terminates retry chain with deterministic failure code
- run persistence tests for failure codes and readable summaries

### Logging

- logger unit tests for redaction rules
- request logging test includes request id and status
- worker/scheduler tests assert structured context fields are present

## Security and Reliability Requirements

- rate limit budgets must be conservative on auth/admin mutation paths
- no secrets in logs (hard requirement)
- no raw stack traces in user-facing API responses
- robots strict mode enabled by default in production
- retry policy must avoid multiplicative retry explosions across layers
- retry budget must bound worst-case wall-clock time for one category run

## Deliverables

1. New logging module and middleware + migrated call sites
2. Route-scoped rate limiting configuration with Redis store support
3. Robots policy checker and adaptive delay implementation
4. Updated retry orchestration in fetch + worker
5. Test coverage for all four workstreams
6. Updated `README.md`, `.env.example`, and `REQUIREMENTS.md` status checkboxes

## Future Scaling Note

Single-worker is the current deployment model.  
When moving to multi-worker later, extend this plan with:

1. shared/distributed robots policy cache (Redis)
2. per-host adaptive-delay coordination across workers
3. queue and limiter observability tuned for parallel worker throughput
