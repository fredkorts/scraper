# Job Management Implementation Plan

## 1. Scope

This plan covers two roadmap items:

- Set up Bull queue + Redis for job management
- Implement `node-cron` scheduler that enqueues jobs based on `categories.next_run_at`

This plan is aligned with the current backend implementation where:

- `scrapeCategory()` creates and completes `scrape_runs`
- `scrapeCategory()` triggers the diff engine
- diff engine creates `change_reports`, `change_items`, and `notification_deliveries`
- immediate and digest notification flows already exist

## 2. Goals

- move scrape execution out of direct process calls and into a resilient queue
- schedule categories based on DB state (`categories.next_run_at`)
- prevent duplicate scrape jobs for the same category
- keep scraping throughput controlled and observable
- preserve current data correctness guarantees

## 3. Non-Goals

- notification channel CRUD API
- payment integration
- distributed tracing/metrics platform rollout
- full multi-node leader election (single scheduler process is assumed for now)

## 4. Major Decisions

### 4.1 Queue library

Use `bullmq` with Redis.

This is the maintained Bull ecosystem implementation (`Bull + Redis` in product wording).

Reason:

- actively maintained Bull ecosystem queue
- strong retry/backoff/concurrency primitives
- first-class delayed jobs and worker events

### 4.2 Queue ownership model

Use dedicated runtime entrypoints:

- API server process (existing `src/index.ts`)
- Scheduler process (`node-cron` tick + enqueue logic)
- Worker process (BullMQ worker consuming scrape jobs)

Reason:

- keeps HTTP concerns isolated from worker lifecycle
- supports horizontal scaling of workers independently

### 4.3 Job deduplication

Use one stable `jobId` per category scrape: `scrape:category:{categoryId}`.

Reason:

- scheduler can safely run every minute without flooding duplicate jobs
- collisions are handled as `skipped-existing` by queue add semantics
- works safely when completed/failed jobs are removed automatically

### 4.4 `next_run_at` ownership

`next_run_at` is advanced by the worker after each terminal scrape outcome (`COMPLETED` or `FAILED`), not by the scheduler.

Reason:

- matches requirement: "recalculated after every run"
- avoids scheduler/worker race on timing updates
- avoids losing schedules when enqueue succeeds/fails mid-flow

### 4.5 Due-category eligibility

Scheduler enqueues a category only if all are true:

- `categories.is_active = true`
- `categories.next_run_at <= now` (or null for first run bootstrap)
- category has at least one active subscription

## 5. Queue Design

### 5.1 Queues

- `scrape-queue`
- optional future extension: `notification-queue` (not required in this phase)

### 5.2 Job payload

`ScrapeCategoryJob`:

- `categoryId: string`
- `trigger: "scheduler" | "manual"`
- `requestedAt: string` (ISO timestamp)

### 5.3 Queue options

- retries: `attempts = 3`
- backoff: exponential, e.g. `10s`, `30s`, `90s`
- concurrency: start with `1` worker concurrency (raise later if safe)
- `removeOnComplete: true`
- `removeOnFail: true`

Reason:

- with stable per-category `jobId`, leaving completed/failed jobs in Redis can block future enqueue for that category
- durable run history is already stored in PostgreSQL (`scrape_runs`), so queue history is not the source of truth

## 6. Scheduler Flow (`node-cron`)

### 6.1 Cron cadence

Run cron every minute:

- expression: `* * * * *`

Reason:

- `next_run_at` precision is timestamp-based
- simple and reliable "poll due work" model

### 6.2 Enqueue algorithm

1. Query due categories with active subscribers.
2. For each category:

- Add job to `scrape-queue` with `jobId = scrape:category:{categoryId}`.
- If add results in a duplicate `jobId` collision, treat as `skipped-existing` and continue.

3. Log enqueue outcomes (enqueued, skipped-existing, failed).

Important:

- scheduler does not modify `next_run_at`
- scheduler is enqueue-only

## 7. Worker Flow (Scrape Job)

1. Receive `ScrapeCategoryJob` with `categoryId`.
2. Call existing `scrapeCategory(categoryId)` orchestration.
3. On success:

- scrape run completes
- diff engine executes
- immediate notification flow executes

4. Update category `next_run_at = now + scrape_interval_hours`.
5. On failure:

- Bull retry policy handles transient retries.
- On non-final failed attempts, do not advance `next_run_at`.
- After final failed attempt, update `next_run_at` to `now + scrape_interval_hours` to avoid tight failure loops.

## 8. Edge Cases and Rules

### 8.1 Category has no active subscribers

- scheduler must not enqueue jobs
- if active jobs exist from earlier state, worker may finish but future schedules stop

### 8.2 `next_run_at` is null

- treat as due for bootstrap
- worker sets first concrete `next_run_at` after run

### 8.3 Long-running job overlaps with next cron ticks

- dedupe by stable `jobId` prevents duplicate concurrent jobs for same category

### 8.4 Category deactivated while job is queued

- worker checks category `isActive` before scraping
- if inactive, skip scrape and roll `next_run_at` forward conservatively

### 8.5 Redis unavailable

- scheduler logs enqueue failures and continues next tick
- worker process exits with clear startup error if Redis is unavailable

### 8.6 Process restarts

- queued jobs remain in Redis
- worker resumes consumption on restart

### 8.7 Manual trigger endpoint (future wiring)

- manual trigger should enqueue same `ScrapeCategoryJob`
- use same `jobId` dedupe strategy unless explicit "force" behavior is added later

## 9. Data and Config Changes

### 9.1 Environment variables

Add:

- `REDIS_URL` (e.g. `redis://localhost:6379`)
- `SCRAPE_WORKER_CONCURRENCY` (default `1`)
- `SCHEDULER_CRON` (default `* * * * *`)

Update config validation in `backend/src/config.ts`.

### 9.2 No DB schema migration required

Existing schema already supports scheduling via:

- `categories.scrape_interval_hours`
- `categories.next_run_at`

## 10. Backend File Plan

Add:

- `backend/src/queue/connection.ts`
- `backend/src/queue/queues.ts`
- `backend/src/queue/job-types.ts`
- `backend/src/queue/enqueue.ts`
- `backend/src/workers/scrape-worker.ts`
- `backend/src/scheduler/enqueue-due-categories.ts`
- `backend/src/scheduler/run-scheduler.ts`

Update:

- `backend/src/config.ts` (Redis + scheduler env)
- `backend/package.json` scripts for scheduler/worker
- `README.md` local run instructions

## 11. Scripts

Add npm scripts in `backend/package.json`:

- `queue:worker` -> starts scrape worker
- `queue:scheduler` -> starts cron scheduler
- optional `queue:drain` (admin/debug local only)

## 12. Testing Plan

### 12.1 Unit tests

- scheduler due-category query filtering
- enqueue helper uses stable `jobId`
- no enqueue for inactive/no-subscriber categories
- next-run calculation helper uses `scrape_interval_hours`

### 12.2 Integration tests (DB + Redis-backed BullMQ)

- due categories are enqueued exactly once per tick
- duplicate tick does not create duplicate queue jobs
- duplicate enqueue for same `jobId` is handled as `skipped-existing`
- retry/backoff executes across attempts and only final failure advances `next_run_at`
- worker success updates `next_run_at`
- worker terminal failure updates `next_run_at` and preserves failure status

### 12.3 Local end-to-end manual checks

1. start Docker (`db`, `redis`)
2. run backend worker and scheduler in separate terminals
3. set one category `next_run_at` to now
4. confirm:

- job appears in queue
- scrape run created
- diff/notification flow executed
- category `next_run_at` advanced

5. kill worker mid-job and restart; verify recovery

## 13. Observability and Operations

- structured logs for:
    - scheduler tick stats
    - enqueue outcomes
    - worker start/complete/fail
- keep failed jobs with capped retention for inspection
- use existing stale-run cleanup script as fallback safety guard

## 14. Implementation Order

1. Add queue dependencies and config (`bullmq`, Redis env validation).
2. Implement queue connection, queue factory, job typing, enqueue helper.
3. Implement scrape worker using existing `scrapeCategory`.
4. Implement cron scheduler and due-category enqueue service.
5. Add scripts and README updates.
6. Write unit/integration tests.
7. Run local end-to-end validation with Docker Redis/Postgres.
8. Mark roadmap checkboxes complete in `REQUIREMENTS.md`.

## 15. Done Criteria

- scheduler enqueues due categories from `next_run_at`
- worker consumes jobs and runs existing scrape->diff->notify pipeline
- no duplicate concurrent jobs per category
- `next_run_at` is advanced after each terminal run outcome
- tests pass for core queue and scheduler logic
- local manual run proves end-to-end behavior
