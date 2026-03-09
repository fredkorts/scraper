# Price Parser False-Drops Fix Implementation Plan

## Status

Implemented (March 9, 2026).

## Implementation Notes

1. Parser hardening, lock fail-closed behavior, system-noise metadata, admin-only `includeSystemNoise`, notification filtering, and reconciliation CLI are implemented.
2. Verification completed locally:
    1. `npm run typecheck --workspace=backend`
    2. `npm run build --workspace=backend`
    3. `npm run test --workspace=backend -- src/scraper/parse.test.ts`
3. Full backend test suite still requires a running local PostgreSQL test database (`localhost:5432` in current environment).

## Summary

Fix false `PRICE_DECREASE` notifications caused by parser selection of non-canonical discounted/member prices from listing markup.

Current parser behavior in [`backend/src/scraper/parse.ts`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/parse.ts) prefers `salePrice` (`.price ins`) over canonical listing price text. This can misread campaign/member values as public prices and generate synthetic drops (for example repeated ~15% drops).

This plan hardens price extraction, adds regression and integration safeguards, and defines a controlled reconciliation flow for already-polluted data.

## Goals

1. Parse canonical public price from listing cards reliably.
2. Preserve valid sale parsing (`<del>` + `<ins>`).
3. Prevent mass false price-drop notifications from parser-only markup shifts.
4. Recover affected category state without triggering false reverse alerts.

## Non-Goals

1. Rewriting diff engine semantics globally.
2. Full product-detail scraping in this phase.
3. Retroactive deletion of already-sent emails.

## Root Cause (Verified)

1. Selector definitions include:
    1. `salePrice: ".price ins .amount, .price ins bdi"`
    2. `currentPrice: ".price .amount, .price ins .amount, .price bdi"`
2. Parsing logic does:
    1. `effectiveCurrentPrice = salePriceText || priceText`
3. Result:
    1. any `<ins>` value wins
    2. non-canonical campaign/member values can be interpreted as true current price.

## Locked Decisions

1. Treat `<ins>` as authoritative current price only when a paired `<del>` exists in the same price block and `del > ins`.
2. If no valid sale pair exists, use non-`del` non-`ins` amount as canonical current price.
3. Keep `originalPrice` populated only when explicit `<del>` exists.
4. Use one canonical recovery path only: reconciliation scrape runs with `skipDiff=true`.
5. Do not use "clear pending deliveries" as a generic reconciliation mechanism.
6. Detection source of truth is `change_items` joined to `change_reports` and `scrape_runs`.
7. Detection is bounded by explicit incident window (`incident_start`, `incident_end`).
8. Category scrape execution lock is Redis-based (`SET NX EX`) with TTL + heartbeat.
9. Lock dependency is fail-closed: if lock backend is unavailable, scrape/reconciliation exits retryably and does not proceed unlocked.
10. Historical snapshots remain immutable; noisy runs are marked and excluded from default user-facing queries.
11. Pending false deliveries are quarantined by setting only `PENDING` rows to `SKIPPED` with explicit reason.
12. `includeSystemNoise=true` is admin-only and enforced at both controller and service layers.
13. Quarantine reason is stored in `notification_deliveries.error_message` with value `SYSTEM_NOISE_RECONCILIATION`.
14. Reconciliation CLI is idempotent; rerunning same category/run set must not double-mutate state.

## Historical Data Policy (Locked)

1. Do not rewrite `product_snapshots` rows.
2. Add run-level metadata on `scrape_runs`:
    1. `isSystemNoise` boolean default `false`
    2. `systemNoiseReason` nullable string
3. Default run/change/snapshot history queries exclude `isSystemNoise=true`.
4. Admin/debug consumers may opt in with `includeSystemNoise=true`.
5. API contract:
    1. `includeSystemNoise=false` default
    2. `includeSystemNoise=true` admin-only
    3. non-admin requests with `includeSystemNoise=true` are rejected.

## Affected Run Detection Criteria (Locked)

A run is a parser-polluted candidate when all conditions match:

1. `PRICE_DECREASE` item count >= `20`.
2. `PRICE_DECREASE` ratio among price-change rows >= `0.60`.
3. Median absolute drop percentage in `[0.12, 0.18]`.
4. Drop percentage stddev <= `0.02`.
5. Run start timestamp inside incident window.

Notes:

1. `scrape_runs.price_changes` is not used as detector input.
2. Auto-detected candidates still require manual operator approval before reconciliation.

Canonical detection SQL (reference implementation):

```sql
WITH price_rows AS (
  SELECT
    sr.id AS scrape_run_id,
    ABS((ci.new_price - ci.old_price) / NULLIF(ci.old_price, 0))::numeric AS drop_pct
  FROM scrape_runs sr
  JOIN change_reports cr ON cr.scrape_run_id = sr.id
  JOIN change_items ci ON ci.change_report_id = cr.id
  WHERE sr.status = 'COMPLETED'
    AND sr.started_at >= :incident_start
    AND sr.started_at <= :incident_end
    AND ci.change_type = 'PRICE_DECREASE'
    AND ci.old_price IS NOT NULL
    AND ci.new_price IS NOT NULL
    AND ci.old_price > 0
),
run_stats AS (
  SELECT
    scrape_run_id,
    COUNT(*) AS price_decrease_count,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY drop_pct) AS median_drop_pct,
    COALESCE(STDDEV_POP(drop_pct), 0) AS stddev_drop_pct
  FROM price_rows
  GROUP BY scrape_run_id
),
run_price_totals AS (
  SELECT
    sr.id AS scrape_run_id,
    COUNT(*) FILTER (WHERE ci.change_type IN ('PRICE_DECREASE', 'PRICE_INCREASE')) AS total_price_change_count
  FROM scrape_runs sr
  JOIN change_reports cr ON cr.scrape_run_id = sr.id
  JOIN change_items ci ON ci.change_report_id = cr.id
  GROUP BY sr.id
)
SELECT
  rs.scrape_run_id,
  rs.price_decrease_count,
  rpt.total_price_change_count,
  (rs.price_decrease_count::numeric / NULLIF(rpt.total_price_change_count, 0)) AS price_decrease_ratio,
  rs.median_drop_pct,
  rs.stddev_drop_pct
FROM run_stats rs
JOIN run_price_totals rpt ON rpt.scrape_run_id = rs.scrape_run_id
WHERE rs.price_decrease_count >= 20
  AND (rs.price_decrease_count::numeric / NULLIF(rpt.total_price_change_count, 0)) >= 0.60
  AND rs.median_drop_pct BETWEEN 0.12 AND 0.18
  AND rs.stddev_drop_pct <= 0.02;
```

## Concurrency and Recovery Safety (Locked)

1. Reconciliation is executed as one batch.
2. Scheduler/worker pause happens once per batch, not per category.
3. Required lock design:
    1. key: `scrape:category:<categoryId>`
    2. acquire: `SET key token NX EX 900`
    3. renew: heartbeat every `30s`
    4. release: token-validated compare-and-delete
4. Stale-lock recovery:
    1. forced unlock only after TTL expiry and owner-not-running verification
    2. forced unlock logged with operator, timestamp, category, reason
5. Fail-closed:
    1. if lock cannot be acquired -> retryable failure
    2. if lock backend errors/unavailable -> retryable failure, no mutation.

## Implementation Scope

## A) Parser hardening

Update [`backend/src/scraper/parse.ts`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/parse.ts):

1. Add helper to extract canonical price fields from `.price` subtree.
2. Helper return:
    1. `currentPriceText`
    2. `originalPriceText?`
    3. `source` (`sale_pair` | `regular` | `fallback`)
3. Selection rules:
    1. valid sale pair (`del`, `ins`, `del > ins`) -> `current=ins`, `original=del`
    2. else first parseable regular amount not inside `del/ins`
    3. accept only canonical WooCommerce amount nodes
    4. reject non-price marker nodes (`%`, campaign labels, etc)
    5. deterministic DOM-order tie break
    6. fallback with parser warning if canonical extraction fails.
4. Remove direct `salePriceText || priceText` precedence.

Update [`backend/src/scraper/selectors.ts`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/selectors.ts):

1. Keep compatibility selectors as needed.
2. Add explicit canonical amount selector(s) used by helper.

## B) Regression and integration tests

Update [`backend/src/scraper/parse.test.ts`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/parse.test.ts):

1. regular price + extra `<ins>` without `<del>` -> regular wins
2. valid `<del> + <ins>` sale -> `ins` current, `del` original
3. multiple amount wrappers deterministic selection
4. campaign/member-like `<ins>` fixture

Add integration coverage:

1. reconciliation run with `skipDiff=true` produces no `change_report`
2. delivery quarantine updates only `PENDING` -> `SKIPPED`
3. non-admin `includeSystemNoise=true` rejected
4. lock backend unavailable -> fail-closed behavior.

## C) Observability guard

Update [`backend/src/scraper/run.ts`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/run.ts) (or extracted helper):

1. Emit `scrape_price_anomaly_detected` when detector thresholds match.
2. Log required fields:
    1. `categoryId`
    2. `scrapeRunId`
    3. `priceDecreaseCount`
    4. `priceDecreaseRatio`
    5. `medianDropPct`
    6. `stddevDropPct`
    7. threshold values used.
3. Config defaults:
    1. `SCRAPER_PRICE_ANOMALY_MIN_DECREASE_COUNT=20`
    2. `SCRAPER_PRICE_ANOMALY_DECREASE_RATIO_THRESHOLD=0.60`
    3. `SCRAPER_PRICE_ANOMALY_MEDIAN_MIN=0.12`
    4. `SCRAPER_PRICE_ANOMALY_MEDIAN_MAX=0.18`
    5. `SCRAPER_PRICE_ANOMALY_STDDEV_MAX=0.02`
    6. `SCRAPER_CATEGORY_LOCK_TTL_SECONDS=900`
    7. `SCRAPER_CATEGORY_LOCK_HEARTBEAT_SECONDS=30`

## D) Data recovery and rollout

Update runbook in [`documentation/backend/RAILWAY_DEPLOYMENT_RUNBOOK.md`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/documentation/backend/RAILWAY_DEPLOYMENT_RUNBOOK.md):

1. detect candidate runs with canonical SQL + incident bounds
2. operator approval artifact completion
3. mark candidate runs `isSystemNoise=true` with reason
4. quarantine old false-alert deliveries:
    1. only `PENDING` rows
    2. set `status=SKIPPED`
    3. set skip reason `SYSTEM_NOISE_RECONCILIATION`
5. pause scheduler and worker (Railway replicas `0`)
6. verify no new worker/scheduler logs and active jobs drained to `0`
7. execute reconciliation scrapes (`skipDiff=true`) for all affected categories
8. verify reconciliation runs:
    1. product prices updated
    2. no `change_report`
    3. no new pending deliveries
9. post-validation SQL checks
10. resume scheduler and worker

Rollback branch:

1. if reconciliation fails, keep scheduler/worker paused
2. capture failure report + SQL snapshot
3. revert partial marks only when validation proves inconsistency
4. rerun validation
5. resume only after operator sign-off.
6. Reconciliation CLI idempotency checks:
    1. skip category if latest completed run is already `isReconciliation=true` with same reason/window
    2. quarantine update uses conditional `WHERE status='PENDING'` and is repeat-safe

## E) Audit trail and migration

Update [`backend/prisma/schema.prisma`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/prisma/schema.prisma) with reconciliation/noise metadata:

1. `isReconciliation` boolean default false
2. `reconciliationReason` nullable string
3. `skipDiff` boolean default false
4. `isSystemNoise` boolean default false
5. `systemNoiseReason` nullable string

Migration contract:

1. new booleans are non-null with defaults
2. new text fields nullable
3. rollout order:
    1. migration deploy
    2. backend deploy consuming new fields
    3. reconciliation tooling enable
4. shared/frontend contract updates included where `includeSystemNoise` is surfaced.

## Proposed File Changes

1. [`backend/src/scraper/parse.ts`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/parse.ts)
2. [`backend/src/scraper/selectors.ts`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/selectors.ts)
3. [`backend/src/scraper/parse.test.ts`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/parse.test.ts)
4. [`backend/src/scraper/run.ts`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/run.ts)
5. new reconciliation CLI under `backend/src/scraper/`
6. [`backend/prisma/schema.prisma`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/prisma/schema.prisma) + migration
7. run/change/snapshot query services (default noise exclusion + include override)
8. notification dispatch query path (quarantine/noise-aware)
9. controller/service auth guard for `includeSystemNoise`
10. [`documentation/backend/RAILWAY_DEPLOYMENT_RUNBOOK.md`](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/documentation/backend/RAILWAY_DEPLOYMENT_RUNBOOK.md)
11. shared/frontend schemas for `includeSystemNoise` where exposed.

## Verification Plan

1. parser unit tests pass
2. backend test suite passes
3. build/lint pass
4. integration checks:
    1. reconciliation `skipDiff` no report
    2. quarantine pending-only behavior
    3. auth guard on `includeSystemNoise`
    4. lock fail-closed
5. SQL validation:
    1. candidate detection result archived
    2. post-quarantine no dispatchable false deliveries
    3. post-reconciliation no change reports on reconciliation runs
6. UI/API smoke:
    1. default noise exclusion for run/change/history paths
    2. admin-only inclusion via `includeSystemNoise=true`.

## Acceptance Criteria

1. standalone `<ins>` no longer overrides canonical price by default
2. valid sale pair still parsed correctly
3. detector query deterministic for bounded incident window
4. anomaly event logged with required fields
5. reconciliation runs are auditable and produce no change reports
6. only pending false deliveries are quarantined
7. default user-facing run/change/history paths exclude noise runs
8. admin-only include override works and is authorization-protected.

## Risks and Mitigations

1. markup drift:
    1. canonical fixtures + parser warning telemetry
2. reconciliation race:
    1. batch pause + lock + drain gate
3. lock dependency outage:
    1. fail-closed retryable behavior
4. hidden historical noise in UX:
    1. default exclusion on run/change/history queries.

## Rollout Checklist

1. merge parser + migration + query/auth changes
2. deploy backend services
3. run bounded detector SQL and operator approval
4. mark noisy runs and quarantine pending false deliveries
5. pause scheduler/worker and verify drain
6. run reconciliation scrapes (`skipDiff=true`)
7. run post-validation SQL and API checks
8. resume scheduler/worker with operator sign-off
9. monitor next 2-3 scheduled runs.

## Operator Approval Artifact

Capture before reconciliation:

1. operator identity
2. approval timestamp
3. affected categories and run ids
4. detector SQL output hash/artifact
5. incident window bounds
6. resume sign-off after post-validation.
