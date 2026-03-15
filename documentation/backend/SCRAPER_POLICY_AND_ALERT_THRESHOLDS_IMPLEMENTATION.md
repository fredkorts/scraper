# Scraper Policy And Alert Thresholds Implementation

## Status

Planned (March 15, 2026).

## Summary

Implement a new operating model across scraping, tracking limits, notification entitlements, and alert filtering:

1. Scheduled scraping every 2 hours during working hours (`09:00` to `22:00`).
2. Worker/scraper hardening for realistic pace and safer runtime behavior.
3. Tracking capacity limits: `free=3`, `paid=6`, `admin=100`.
4. Notification channel entitlement: free users email only; paid/admin are eligible for Telegram.
5. User-configurable alert thresholds (for price rise/drop percentages).
6. Remove interval-management UI/flows because interval is now fixed by policy.
7. Prepare Telegram capability scaffolding now; defer full Telegram delivery transport to a later implementation.
8. Execute a mandatory strict compatibility phase before behavioral cutover to avoid breaking existing clients/tests.

## Locked Product Decisions

1. Scraping should run on a work-hours schedule, not continuously.
2. Free users get 3 total tracking slots.
3. Paid users get 6 total tracking slots.
4. Admin users get 100 total tracking slots.
5. Free users cannot use Telegram notifications.
6. Paid and admin users can use Telegram notifications.
7. All users can configure alert thresholds for price percentage changes.
8. Per-category scrape interval is no longer user-configurable in UI.
9. Scheduling is slot-based (`09,11,13,15,17,19,21`) and does not drift.
10. Missed slots are skipped; system always advances to the next slot.
11. On plan downgrade, tracked items are auto-disabled and users can re-enable only up to their new limit.
12. Keep bot identity transparent in `User-Agent` (no impersonation).

## Current-State Audit Findings

1. Scheduler currently ticks continuously by cron and enqueues based on `nextRunAt` + active subscriptions.
2. Category intervals currently support `6|12|24|48` hours only.
3. Tracking limits are currently `free=3`, `paid=6`, `admin=unlimited`.
4. Notification channel enum supports multiple types, but runtime flow currently processes email only.
5. Delivery creation currently includes all category recipients without threshold filtering.
6. Scraper pacing is configurable, but defaults are relatively aggressive for production politeness.
7. Admin/settings views currently expose `Interval` column and interval update actions that conflict with the new fixed-policy model.
8. Recovery/catch-up behavior for missed scheduler windows is not explicitly documented.
9. Throughput and slot-budget control is not explicitly modeled today.

## Scope

1. Include:

- Scheduler and worker behavior changes.
- Scraper HTTP pacing/header policy updates.
- Tracking-capacity policy update.
- Telegram channel entitlement and transport scaffolding (full transport deferred to later phase).
- User alert-threshold storage and filtering in notification flow.
- Backend/API/shared/frontend settings updates needed to expose and use these capabilities.
- Removal of interval controls (`Interval` column and interval update section) in Settings/Admin UX.
- Backend deprecation of interval update endpoint behavior.
- Throughput governance for slot-based execution.
- Mandatory strict compatibility layer for API/UI/schema evolution.

2. Exclude:

- New provider types beyond Telegram.
- Full Telegram transport/send pipeline in this iteration (scaffolding only).
- Full per-category/per-product threshold matrix in v1 (global per-user thresholds only).
- Major frontend redesign beyond settings controls and basic UX states.

## Strict Compatibility Phase (Mandatory)

This phase must complete before enabling new policy flags in production.

1. Compatibility constraints:

- additive-only response changes in Release C0
- no removal/rename of existing fields in Release C0
- no hard-fail behavior changes for existing interval clients in Release C0

2. Interval compatibility contract:

- keep `scrapeIntervalHours` field in responses during compatibility phase
- accept legacy interval payload shape on `PATCH /api/categories/:id/settings`, but treat as policy no-op
- return explicit metadata: `applied=false`, `deprecationCode=interval_policy_fixed`, `effectiveIntervalHours=2`
- add deprecation headers (`Deprecation`, `Sunset`) and caller telemetry

3. Schema/parser compatibility:

- update shared/frontend/backend interval validators to accept `2` plus legacy values during transition
- treat non-`2` values as legacy-compatible input that does not mutate scheduler policy

4. Notification compatibility:

- add structured skip reason support (for example `below_threshold`) while keeping legacy text message fallback for old consumers
- preserve existing email delivery behavior while Telegram remains disabled

5. Role/capacity compatibility:

- preserve existing response shape (`limit`, `used`, `remaining`) and add additive fields for cap state if needed
- enforce admin soft-cap behavior server-side without removing legacy fields

6. Cutover gate:

- interval UI removal and `410` endpoint behavior are blocked until compatibility tests pass across backend + frontend + route tests
- production flag enablement requires compatibility checklist sign-off

## Architecture Plan

## A. Scheduler + Work-Hour Execution Model

1. Add explicit scheduling policy configuration:

- `SCRAPER_BUSINESS_TIMEZONE` (example: `Europe/Tallinn`)
- `SCRAPER_WORK_HOURS_START=09:00`
- `SCRAPER_WORK_HOURS_END=22:00`
- `SCRAPER_FIXED_INTERVAL_HOURS=2`

2. Keep scheduler tick frequent (every minute), but gate enqueue eligibility by business-hour window.

3. Enqueue only when:

- category active
- has active subscribers (except manual runs)
- due by `nextRunAt`
- current local business time is inside allowed window

4. Preserve manual admin trigger behavior independent of work-hour gate.
5. Move worker `nextRunAt` calculation to fixed **slot-based** policy (not per-category interval):

- slot start hours: `09,11,13,15,17,19,21`
- on completion/failure, compute next future slot boundary
- do not schedule `now + 2h` drifted timestamps

6. Catch-up policy:

- if a slot is missed (downtime/queue delay), skip to the next upcoming slot
- do not burst-run missed historical slots

## A.1 Throughput Governance (Best Option)

Use a slot-budget scheduler:

1. Acquire a scheduler lease (distributed lock) so only one scheduler instance computes and enqueues slot budget per timezone window.
2. Compute per-slot request budget using:

- worker concurrency
- average request duration
- configured delay/jitter range
- available slot window

3. Estimate category cost using rolling average `pages_scraped`.
4. Enqueue oldest-due categories until slot budget is consumed.
5. Defer overflow categories to next slot.
6. Emit metrics: budget, consumed budget, deferred categories, lease-owner instance, and lease-contention count.

## B. Worker Behavior And Safety Hardening

1. Keep existing lock + dedupe + retry-budget architecture.
2. Add/strengthen guardrails:

- terminal handling for repeated `429`/anti-bot responses
- jittered backoff and clearer retry observability
- boundary-safe `nextRunAt` advancement on failure
- scheduled-job stale-window policy: if a scheduled job starts outside work window, skip execution and reschedule to next valid slot (manual jobs remain exempt)

3. Add explicit operational logging/metrics:

- queue depth
- retries per job
- budget exhaustion count
- skipped outside-window count
- robots deny count

## C. Realistic Request Pace And User-Agent Policy

1. Update defaults toward more human-like pace:

- `SCRAPER_MIN_DELAY_MS`: increase (recommended 2500+)
- `SCRAPER_MAX_DELAY_MS`: increase (recommended 7000+)
- `SCRAPER_ADAPTIVE_DELAY_MAX_MS`: keep significantly above max delay

2. Keep adaptive-delay mechanism enabled.

3. Keep a transparent bot `User-Agent` with contact metadata (no deceptive browser impersonation).

4. Continue respecting robots rules and timeouts.

## D. Tracking Capacity Policy Update

1. Change role limits in capacity service:

- free: 3
- paid: 6
- admin: 100

2. Keep shared-capacity rule (subscriptions + tracked products).

3. Migration policy for existing admins above 100:

- soft-cap recommended in v1 (block new additions until below cap; do not auto-delete existing records).

4. Downgrade policy:

- on role downgrade, auto-disable active trackers over new allowed limit
- allow user to re-enable items manually up to limit
- emit user-facing reason code and audit log event

## E. Channel Entitlements (Email + Telegram)

1. Add Telegram readiness scaffolding for paid/admin users.
2. Enforce entitlement model at channel create/update time:

- free can only create/use email channels
- paid/admin can create/use email and telegram

3. Keep `NOTIFICATIONS_TELEGRAM_ENABLED=false` by default in this phase.
4. For telegram operations while disabled, return deterministic `not_enabled` behavior.
5. Keep email available to all roles.
6. Role-downgrade entitlement reconciliation:

- when paid/admin downgrades to free, auto-disable existing telegram channels
- if disabled channel was default, atomically switch default to active email channel
- emit audit log event (`notification_channel_disabled_by_entitlement`)

## F. Alert Thresholds

1. Add per-user notification preferences (global thresholds):

- `minPriceDropPct`
- `minPriceRisePct`
- both values validated to `0..100` inclusive (decimal supported)

2. Threshold math contract:

- `pctChange = ((newPrice - oldPrice) / oldPrice) * 100` when `oldPrice > 0`
- when `oldPrice <= 0` or missing, mark as `non_comparable_price_change` and do not apply percentage threshold filtering
- drop threshold applies when `pctChange <= -minPriceDropPct`
- rise threshold applies when `pctChange >= minPriceRisePct`
- use decimal math for filtering; round only for display

3. Apply threshold filtering in notification composition pipeline:

- if change is price-related and percent change is below configured threshold, skip it
- if no items remain for a delivery, mark delivery `SKIPPED` with explicit reason

4. Stock-state and new-product alerts remain unaffected in v1 unless additional policy is defined.
5. `all-items-filtered` behavior:

- delivery status: `SKIPPED`
- reason code: `below_threshold`
- UI copy: “Skipped by your alert threshold preferences”
- analytics counter: `deliveries_skipped_below_threshold`

## G. Settings/Admin Interval UX Cleanup

1. Remove `Interval` column from admin/scheduler tables in frontend.
2. Remove interval update section/actions from settings/admin panels.
3. Keep scheduler state visibility (eligibility, queue status, next run) without editable interval controls.
4. Backend route policy:

- deprecate `PATCH /api/categories/:id/settings` for interval changes
- follow staged deprecation policy (see `API Deprecation Course` below)

## Data Model And Contract Changes

## 1. Prisma

1. `NotificationChannelType`:

- ensure `TELEGRAM` exists and is used by runtime logic

2. Add preferences table (recommended):

- `user_notification_preferences`
- `user_id` unique FK
- `min_price_drop_pct` decimal with check constraint `>=0 and <=100`
- `min_price_rise_pct` decimal with check constraint `>=0 and <=100`
- timestamps

3. Optional schedule-policy table is not required in v1; env-driven policy is acceptable.
4. `Category.scrapeIntervalHours` compatibility policy:

- keep field temporarily for backward compatibility
- backfill existing values to `2`
- treat field as read-only legacy output
- ignore interval mutation input and return policy-based value in API responses

5. Add notification delivery skip reason storage (recommended):

- `notification_deliveries.skip_reason` nullable string/enum
- keep `error_message` for human-readable compatibility during rollout

## 2. Shared Types

1. Channel types: include telegram in contracts used by frontend/backend.
2. Add DTOs for notification threshold preferences.
3. Add response payloads for preferences read/update endpoints.
4. Compatibility DTO additions:

- interval deprecation metadata for category settings response (`applied`, `deprecationCode`, `effectiveIntervalHours`)
- optional delivery skip reason field without removing existing fields

## 3. Backend API

1. New/extended settings endpoints:

- get notification preferences
- update notification preferences

2. Existing notification channel endpoints:

- add role-based entitlement validation for telegram channel operations.

3. Category settings endpoint:

- remove interval-mutation behavior from public/admin workflow.

4. Add deterministic machine-readable deprecation error codes for interval-update operations.
5. During deprecation Release N, return explicit response metadata (`applied=false`, `deprecationCode=interval_policy_fixed`) instead of silent no-op semantics.
6. Compatibility mode response guarantee:

- in Release C0 and Release N, keep success status (`200`) for legacy interval calls with no-op metadata payload

## 4. Frontend

1. Settings UI:

- show threshold controls for all users
- show Telegram channel option only for paid/admin
- show clear entitlement messaging for free users

2. Admin/settings scheduler views:

- remove `Interval` column
- remove interval update controls/forms

3. Compatibility sequencing rule:

- do not remove interval UI until Release N backend metadata contract is live and frontend consumers are updated

## Implementation Phases

## Phase 0: Prep

1. Add feature flags:

- `SCRAPER_WORK_HOURS_ENABLED`
- `NOTIFICATIONS_TELEGRAM_ENABLED`
- `NOTIFICATIONS_THRESHOLDS_ENABLED`
- `TRACKING_ADMIN_CAP_ENABLED`

2. Add observability counters/log fields before behavior changes.

## Phase 0.5: Strict Compatibility (Mandatory)

1. Ship schema/type compatibility changes first:

- allow `2` and legacy interval values in validators/parsers
- add additive deprecation metadata fields
- add additive delivery `skipReason` field support

2. Ship API compatibility behavior:

- `PATCH /api/categories/:id/settings` returns `200` + no-op metadata in compatibility mode
- no client-facing hard failures yet for interval mutation attempts

3. Ship frontend compatibility updates:

- parse new additive metadata fields
- tolerate `2` interval values in all schemas/mocks/tests
- keep interval UI functional but marked deprecated/read-only until removal release

4. Exit criteria:

- compatibility integration tests green
- no contract regressions in existing settings/admin flows
- telemetry confirms deprecation metadata observed by active clients

## Phase 1: Work-Hour Scheduling + Pacing

1. Implement window gating in scheduler enqueue path.
2. Add timezone-aware boundary handling.
3. Add distributed scheduler lease to avoid multi-instance over-enqueue.
4. Add stale-window behavior for scheduled jobs that start outside business window.
5. Update scrape pacing defaults and retry policies.
6. Update worker scheduling calculations to fixed interval policy.
7. Keep compatibility mode active for interval endpoint until Release N+1 cutover.

## Phase 2: Capacity Rule Update

1. Update tracking-capacity service for admin cap 100.
2. Implement soft-cap behavior for pre-existing over-limit admins.
3. Update response messaging and tests.

## Phase 3: Telegram Entitlements

1. Implement entitlement validation in notification-channel service.
2. Add enum/contracts/flags for Telegram capability.
3. Keep Telegram transport out of scope; return `not_enabled` while disabled.
4. Add role-downgrade reconciliation for existing telegram channels.
5. Add integration tests for role-based entitlement + disabled-provider behavior + downgrade cleanup.

## Phase 4: Alert Thresholds

1. Add preferences schema + migration + service + controllers.
2. Integrate filtering in delivery preparation/sending.
3. Add preference validation (`0..100`) in API and UI forms.
4. Add settings UI controls.
5. Add snapshot/integration tests for threshold behavior and non-comparable old-price events.

## Phase 5: Rollout

1. Deploy schema first.
2. Deploy backend compatibility layer.
3. Deploy frontend settings controls.
4. Enable flags progressively by environment.
5. Only after compatibility gates pass, remove interval UI and move endpoint to `410` phase.

## Phase 6 (Deferred): Telegram Transport

1. Implement Telegram transport adapter.
2. Integrate into immediate/digest sender routing.
3. Add rate-limiting, retry, and provider-outage handling.

## TDD Test Plan

## 1. Scheduler/Worker

1. Enqueue only inside work window.
2. No enqueue outside window.
3. Boundary tests at `09:00`, `21:59`, `22:00`.
4. DST transition tests for configured timezone.
5. Retry budget and non-retryable handling tests remain green.
6. Worker `nextRunAt` advances to next valid slot (no drift).
7. Missed slots are skipped (no catch-up burst).
8. Slot-budget tests validate defer-overflow behavior.
9. Multi-scheduler lease tests ensure only lease-holder enqueues slot work.
10. Scheduled jobs starting outside work window are re-slotted without scrape execution.

## 2. Capacity

1. free: block at 3.
2. paid: block at 6.
3. admin: block new additions at 100 under soft-cap strategy.
4. shared-slot accounting remains correct.

## 3. Channel Entitlements

1. free cannot create telegram channel (`403/validation error`).
2. paid/admin can create telegram channel.
3. while feature disabled, telegram use returns deterministic `not_enabled`.
4. downgrade paid/admin -> free disables telegram channels and preserves a valid default email channel.

## 4. Threshold Filtering

1. price drop below threshold is skipped.
2. price rise below threshold is skipped.
3. price change above threshold is delivered.
4. stock/new-product alerts are unaffected.
5. empty post-filter deliveries become `SKIPPED` with reason.
6. `oldPrice <= 0` follows `non_comparable_price_change` behavior and does not crash filtering.
7. threshold values outside `0..100` are rejected.

## 5. End-to-End

1. subscribed category scrape -> change report -> delivery creation.
2. same flow with thresholds set -> expected filtered outcomes.
3. if all threshold-filtered, delivery is `SKIPPED` with `below_threshold`.
4. settings/admin pages no longer show interval column or interval update controls.
5. Release N interval endpoint returns `applied=false` deprecation metadata.
6. Release N+1 interval endpoint returns `410 interval_policy_fixed`.
7. Existing frontend/admin flows do not fail during Release C0/Release N compatibility windows.

## 6. Compatibility

1. Frontend schemas accept interval value `2` without parse failures.
2. Legacy interval update calls receive `200` with no-op metadata in compatibility mode.
3. Notification deliveries continue to support legacy fields while emitting structured skip reasons.
4. Admin scheduler/settings tests pass before and after interval UI removal release.

## Acceptance Criteria

1. Automatic scraping only runs during configured business hours.
2. Default category scrape interval is 2 hours.
3. Scraper request pace and headers are updated to safer production defaults.
4. Tracking limits enforced as `3/6/100`.
5. Telegram entitlements and scaffolding exist; full delivery transport is deferred and feature-flagged off.
6. Users can configure threshold preferences and notifications respect them.
7. Admin/settings UX no longer exposes interval mutation controls.
8. Only lease-holder scheduler instance can enqueue slot work.
9. Role downgrade correctly reconciles entitlement-restricted notification channels.
10. Lint, typecheck, and targeted integration tests pass.
11. Compatibility phase exit criteria are met before any destructive API/UI deprecation step.

## Risks And Mitigations

1. Risk: timezone misconfiguration causes unexpected scheduling.

- Mitigation: strict config validation + boundary tests + startup logs of resolved schedule policy.

2. Risk: threshold filtering silently suppresses too many alerts.

- Mitigation: explicit skip reasons + per-user preview text in settings + metrics for skipped-by-threshold counts.

3. Risk: deferred Telegram work creates expectation mismatch.

- Mitigation: explicit feature-flag state, API messaging, and release notes.

4. Risk: admin cap change surprises existing heavy users.

- Mitigation: soft-cap rollout + release notes + admin state visibility.

5. Risk: multiple scheduler instances over-enqueue same slot.

- Mitigation: distributed scheduler lease + contention metrics + lease expiry safety tests.

6. Risk: deprecation no-op semantics hide broken clients.

- Mitigation: explicit `applied=false` response contract in Release N + caller telemetry + N+1 hard failure.

7. Risk: contract drift between shared types and frontend/backend schemas during cutover.

- Mitigation: mandatory Phase 0.5 compatibility gate + parser dual-acceptance tests.

## Open Questions

1. Should threshold settings support separate values for tracked products vs category-level alerts in v1?
2. Should out-of-hours manual triggers be rate-limited differently from scheduler-triggered jobs?
3. Should digest batching include a minimum absolute EUR change floor in addition to percentage threshold?

## API Deprecation Course (Interval Endpoints)

1. Release N:

- keep endpoint callable
- return deprecation warning header/body metadata
- return `applied=false` and `deprecationCode=interval_policy_fixed` in response body
- log callers

2. Release N+1:

- return `410 Gone` with machine-readable code: `interval_policy_fixed`

3. Release N+2:

- remove endpoint wiring and dead code paths

## Release Runbook (Strict Compatibility -> Final Cutover)

## Preflight Gate (Before Release C0)

1. Confirm schema migration strategy is forward-compatible:

- enum additions and new columns are additive
- no destructive migrations scheduled in this window

2. Confirm feature flags default to safe state:

- `SCRAPER_WORK_HOURS_ENABLED=false`
- `NOTIFICATIONS_THRESHOLDS_ENABLED=false`
- `NOTIFICATIONS_TELEGRAM_ENABLED=false`
- `TRACKING_ADMIN_CAP_ENABLED=false`

3. Confirm dashboards/alerts exist for:

- scheduler tick health
- queue lag
- scrape failures and upstream `429` ratio
- interval endpoint call volume and deprecation metadata call volume

4. Confirm compatibility tests pass in CI:

- frontend schema/parser tests
- backend contract tests
- settings/admin route tests

## Release C0 (Compatibility Release)

1. Goal:

- ship additive schema/contracts and no-break API behavior only

2. Deploy order:

- deploy DB migration (preferences table, optional delivery `skip_reason`, telegram enum scaffolding)
- deploy backend compatibility behavior (`PATCH /categories/:id/settings` returns `200` with no-op metadata)
- deploy frontend parser/schema tolerance for interval `2` and new metadata fields

3. Flags:

- keep all new behavior flags off

4. Validation checklist:

- legacy interval update requests still return success (`200`)
- response includes `applied=false` and `deprecationCode=interval_policy_fixed`
- existing settings/admin flows still pass manual QA

5. Rollback triggers:

- frontend parse failures on categories/settings payloads
- `5xx` spike on categories/settings or notifications routes
- admin/settings flow regression in smoke tests

6. Rollback steps:

- rollback frontend first if parsing/UI issue
- rollback backend app version if route behavior regressed
- do not rollback additive DB migration; keep code-level compatibility path active

## Release N (Policy Activation With Compatibility)

1. Goal:

- activate work-hour scheduler, slot logic, admin cap, and threshold processing while keeping interval endpoint compatibility response

2. Deploy order:

- deploy backend scheduler/worker/capacity/threshold logic behind flags
- enable flags progressively per environment:
- `SCRAPER_WORK_HOURS_ENABLED=true`
- `TRACKING_ADMIN_CAP_ENABLED=true`
- `NOTIFICATIONS_THRESHOLDS_ENABLED=true`
- keep `NOTIFICATIONS_TELEGRAM_ENABLED=false`
- deploy frontend UI updates (interval controls marked deprecated/read-only or hidden behind compatibility-safe branch)

3. Validation checklist:

- scheduler enqueues only in work window
- no duplicate enqueue across scheduler replicas (lease metrics healthy)
- threshold skips recorded with structured reason and expected counters
- admin usage/soft-cap UI shows correct values

4. Rollback triggers:

- queue lag p95 breach sustained beyond alert threshold
- scrape failure/429 ratio breach sustained beyond alert threshold
- threshold over-filtering spike beyond expected baseline
- unexpected admin lockout behavior

5. Rollback steps:

- turn off `SCRAPER_WORK_HOURS_ENABLED` and/or `NOTIFICATIONS_THRESHOLDS_ENABLED` first
- if needed disable `TRACKING_ADMIN_CAP_ENABLED`
- keep compatibility API responses active; do not introduce `410` in this rollback

## Release N+1 (Hard Deprecation)

1. Goal:

- switch interval update endpoint from compatibility `200` to hard deprecation `410`

2. Deploy order:

- backend deploy returning `410 interval_policy_fixed` for interval mutation
- frontend deploy with interval controls fully removed

3. Validation checklist:

- no active clients still relying on interval mutation path (telemetry near-zero)
- settings/admin UI no longer renders interval controls
- route tests assert `410` semantics

4. Rollback triggers:

- significant legacy caller volume still present
- critical admin workflow break due to delayed frontend rollout

5. Rollback steps:

- revert backend to Release N compatibility behavior (`200` no-op metadata)
- redeploy frontend compatibility branch if required

## Release N+2 (Cleanup)

1. Goal:

- remove dead interval endpoint wiring and compatibility-only code

2. Deploy order:

- backend cleanup deploy only after at least one stable cycle on N+1
- frontend cleanup for deprecation messaging

3. Validation checklist:

- no references to removed endpoint in client code/tests
- no error-rate regression after cleanup

4. Rollback triggers:

- unexpected backend route errors after dead-code removal

5. Rollback steps:

- rollback backend app artifact
- re-enable N+1 behavior (hard deprecation route) before retrying cleanup

## Rollback Principles

1. Prefer flag rollback over code rollback for behavioral incidents.
2. For additive DB migrations, use forward-fix strategy rather than schema rollback.
3. Roll back frontend before backend when parse/render errors are user-facing.
4. Keep interval compatibility behavior available until telemetry confirms safe hard cutover.
5. Record incident + rollback context in release notes before next rollout attempt.

## Admin-Cap Soft-Cap Course

1. Existing admins above 100:

- keep existing active trackers
- block only new create/enable actions until usage `< 100`

2. UI:

- show current usage and “soft-capped” banner

3. Audit:

- emit structured event on blocked actions

## SLOs And Alerts Baseline

1. Scheduler tick success rate: `>=99.9%` (5m window alert).
2. Slot enqueue delay (`scheduled slot` -> `job enqueued`) p95 `<5m`.
3. Queue lag p95 `<30m` during business hours.
4. Scrape non-skip failure rate `<10%` per business day.
5. Upstream 429 ratio alert when `>5%` over 15 minutes.
6. Notification delivery failure rate alert when `>2%` over 15 minutes.
7. Threshold-skip ratio observed and dashboarded to detect over-filtering misconfig.

## Migration Checklist

1. Schema and contracts:

- [ ] Add `user_notification_preferences` migration.
- [ ] Add shared DTOs for threshold preferences.
- [ ] Add telegram channel enum/contract scaffolding.

2. Scheduler and worker:

- [ ] Implement slot-based next-run calculation.
- [ ] Implement skip-missed-slot policy.
- [ ] Implement work-hour gate with timezone support.
- [ ] Implement slot-budget enqueue governor.
- [ ] Implement distributed scheduler lease/leader election for per-slot budgeting.
- [ ] Implement stale-window rescheduling for scheduled jobs starting out of hours.

3. Scraper behavior:

- [ ] Update delay defaults and adaptive limits.
- [ ] Update transparent bot `User-Agent` default.
- [ ] Add 429/backoff telemetry fields.

4. Tracking capacity:

- [ ] Enforce `3/6/100` limits in capacity service.
- [ ] Implement downgrade auto-disable flow.
- [ ] Implement admin soft-cap blocking for new actions above 100.
- [ ] Add downgrade reconciliation for entitlement-restricted notification channels.

5. Interval deprecation and UI:

- [ ] Ship compatibility mode (Release C0): `200` no-op with deprecation metadata.
- [ ] Remove `Interval` column from settings/admin tables.
- [ ] Remove interval update controls/forms.
- [ ] Ship Release N deprecation warnings.
- [ ] Ship Release N+1 `410 interval_policy_fixed`.

6. Threshold preferences:

- [ ] Add preferences read/update API.
- [ ] Add threshold math filtering in delivery pipeline.
- [ ] Mark all-filtered deliveries as `SKIPPED` with `below_threshold`.
- [ ] Add settings UI for threshold controls.
- [ ] Enforce `0..100` threshold validation in API and UI.
- [ ] Implement and test `oldPrice <= 0` non-comparable behavior.

7. Telegram readiness:

- [ ] Enforce role entitlement checks.
- [ ] Add `NOTIFICATIONS_TELEGRAM_ENABLED` feature flag path.
- [ ] Return deterministic `not_enabled` while disabled.

8. Observability:

- [ ] Add SLO dashboards for scheduler/queue/scrape/notification.
- [ ] Add alerts for lag, 429 spikes, and delivery failures.
- [ ] Add dashboard for interval endpoint legacy caller volume during compatibility window.

9. Validation:

- [ ] Backend lint/typecheck/tests pass.
- [ ] Frontend lint/typecheck/tests pass.
- [ ] End-to-end business-hour slot simulation passes.
- [ ] Multi-scheduler simulation proves single lease-holder enqueue behavior.
- [ ] Deprecation contract tests cover Release N (`applied=false`) and N+1 (`410`).
- [ ] Compatibility tests cover Release C0 no-break guarantees.

## Platform Deployment Checklist (Railway + Vercel)

## 1. One-Time Platform Setup

1. Railway (backend services):

- [ ] Ensure separate Railway services exist for API, scheduler, and worker (or equivalent process model).
- [ ] Ensure all services use the same `DATABASE_URL` and `REDIS_URL`.
- [ ] Ensure health checks are configured for API service.
- [ ] Ensure logs/metrics are enabled and retained for release windows.

2. Vercel (frontend):

- [ ] Ensure production environment variables match backend production base URL and feature expectations.
- [ ] Ensure preview deployments are enabled for release candidate QA.
- [ ] Ensure frontend build uses latest shared package contracts.

## 2. Environment Variable Checklist

1. Railway:

- [ ] `SCRAPER_WORK_HOURS_ENABLED`
- [ ] `NOTIFICATIONS_THRESHOLDS_ENABLED`
- [ ] `NOTIFICATIONS_TELEGRAM_ENABLED`
- [ ] `TRACKING_ADMIN_CAP_ENABLED`
- [ ] `SCRAPER_BUSINESS_TIMEZONE`
- [ ] `SCRAPER_WORK_HOURS_START`
- [ ] `SCRAPER_WORK_HOURS_END`
- [ ] `SCRAPER_FIXED_INTERVAL_HOURS`
- [ ] `SCRAPER_MIN_DELAY_MS`
- [ ] `SCRAPER_MAX_DELAY_MS`
- [ ] `SCRAPER_ADAPTIVE_DELAY_MAX_MS`
- [ ] `SCRAPER_USER_AGENT`

2. Vercel:

- [ ] Frontend API base URL vars point to current Railway API deployment.
- [ ] Any frontend feature toggles for compatibility/deprecation states are set per target release.

## 3. Release C0 Checklist (Compatibility)

1. Railway:

- [ ] Deploy DB additive migration first.
- [ ] Deploy backend compatibility build.
- [ ] Confirm `PATCH /api/categories/:id/settings` returns `200` + deprecation metadata.
- [ ] Keep behavior flags disabled (`SCRAPER_WORK_HOURS_ENABLED=false`, `NOTIFICATIONS_THRESHOLDS_ENABLED=false`, `TRACKING_ADMIN_CAP_ENABLED=false`, `NOTIFICATIONS_TELEGRAM_ENABLED=false`).

2. Vercel:

- [ ] Deploy frontend compatibility build (schema tolerance for interval `2` + additive metadata).
- [ ] Validate settings/admin pages load with no schema parse/runtime errors.

3. Smoke tests:

- [ ] Admin interval update request returns compatibility metadata, not hard failure.
- [ ] Existing tracked categories/products and notifications UI still work.

## 4. Release N Checklist (Policy Activation)

1. Railway:

- [ ] Deploy backend policy build.
- [ ] Enable flags progressively:
- [ ] `SCRAPER_WORK_HOURS_ENABLED=true`
- [ ] `TRACKING_ADMIN_CAP_ENABLED=true`
- [ ] `NOTIFICATIONS_THRESHOLDS_ENABLED=true`
- [ ] `NOTIFICATIONS_TELEGRAM_ENABLED=false` (remain off)
- [ ] Confirm scheduler lease metrics and queue lag dashboards are healthy.

2. Vercel:

- [ ] Deploy frontend that supports threshold controls and compatibility interval behavior.
- [ ] Confirm admin/settings UI reflects soft-cap and threshold states.

3. Smoke tests:

- [ ] Scheduler enqueues only during configured work-hours slots.
- [ ] Threshold filtering produces expected `SKIPPED` outcomes and metrics.
- [ ] Admin soft-cap behavior blocks new additions over 100.

## 5. Release N+1 Checklist (Hard Deprecation)

1. Railway:

- [ ] Deploy backend that returns `410 interval_policy_fixed` for interval update endpoint.
- [ ] Confirm legacy caller telemetry is acceptably low before/after deployment.

2. Vercel:

- [ ] Deploy frontend with interval UI removed.
- [ ] Confirm no frontend code still calls interval update mutation.

3. Smoke tests:

- [ ] Interval endpoint returns `410` with machine-readable code.
- [ ] Settings/admin flows remain functional without interval controls.

## 6. Release N+2 Checklist (Cleanup)

1. Railway:

- [ ] Deploy backend cleanup build removing dead interval compatibility wiring.
- [ ] Confirm no new route errors after cleanup.

2. Vercel:

- [ ] Deploy frontend cleanup (remove deprecation-only messaging if applicable).

3. Smoke tests:

- [ ] No contract regressions in settings/admin/runs flows.
- [ ] Observability remains within SLO bounds.

## 7. Rollback Execution Checklist

1. Immediate actions:

- [ ] Freeze further rollouts.
- [ ] Capture incident timestamp, version, and active flag states.

2. Railway rollback:

- [ ] Prefer disabling behavior flags before artifact rollback.
- [ ] If needed, rollback backend service artifact to previous stable release.
- [ ] Keep additive schema changes in place; use forward-fix.

3. Vercel rollback:

- [ ] Promote previous stable frontend deployment.
- [ ] Re-run smoke tests against rolled-back frontend.

4. Post-rollback verification:

- [ ] API error rates normalized.
- [ ] Scheduler/queue metrics back within thresholds.
- [ ] Settings/admin critical paths operational.
