# Auth + Database + Queue Hardening Implementation Plan (2026-03-22)

## Status

- Drafted for implementation.
- Architect-audited revision applied.

## Related Inputs

- Security assessment completed on 2026-03-22 (auth/database/queue attack surface review).
- Existing implementation docs:
    - `documentation/backend/AUTH_HARDENING_IMPLEMENTATION.md`
    - `documentation/backend/CSRF_SESSION_RESILIENCE_IMPLEMENTATION.md`
    - `documentation/backend/RATE_LIMIT_RESILIENCE_IMPLEMENTATION.md`

## Goal

Close identified auth/data/queue security gaps in a staged, deployment-safe rollout with mandatory automated tests for each control.

## Scope

1. JWT/cookie auth and authorization consistency.
2. CSRF and origin protections for all cookie-auth mutations.
3. Rate-limit anti-abuse hardening.
4. PostgreSQL runtime security posture and data access safety.
5. Redis/BullMQ security controls.

## Architecture Principles

1. Backward compatibility first: every change must support mixed-version frontend/backend for one deployment window.
2. Security controls must be enforceable, not documentation-only.
3. Ship in small, reversible slices on the critical path.
4. Prefer fail-closed for privileged flows and fail-safe for read-only diagnostics.
5. Tie every control to observability, alerts, and rollback switches.
6. Remove temporary feature flags after stabilization to prevent long-term policy drift.

## Ownership

1. Backend platform owner:

- auth middleware, JWT, CSRF, rate limiting, queue security code.

2. Data owner:

- Prisma schema/migrations, DB roles, connection policies.

3. DevOps owner:

- secret manager wiring, Redis/Postgres network controls, deploy checks.

4. QA owner:

- security regression suite and release sign-off.

---

## Release Strategy (Deploy-Safe Slices)

1. Slice A: observability, feature flags, config validation guards.
2. Slice B: secret hygiene and JWT key rotation framework.
3. Slice C: CSRF/origin expansion with frontend compatibility gates.
4. Slice D: authz freshness guard for privileged endpoints.
5. Slice E: token-version schema + dual-read/dual-write + enforcement.
6. Slice F: rate-limit hardening and proxy correctness verification.
7. Slice G: Redis/BullMQ trust boundary and payload validation controls.
8. Slice H: operational hardening completion and lock-in.

Each slice must be independently deployable and reversible.

---

## Phase 0: Baseline and Guardrails (Pre-Work)

### Tasks

1. Create hardening tracker issue with sub-tasks per slice.
2. Add feature flags and defaults:

- `AUTHZ_FRESHNESS_ENABLED=false`
- `AUTH_TOKEN_VERSION_ENFORCED=false`
- `AUTH_MUTATION_CSRF_STRICT_MODE=false`
- `QUEUE_JOB_SCHEMA_STRICT_MODE=false`

3. Capture baseline metrics:

- auth 401/403/429 rates by route
- refresh failure reasons
- p95/p99 latency for auth routes
- queue enqueue rate, failure rate, lag, and duplicate rates

### Tests

1. No new functional tests.
2. Add metric-contract tests where applicable (logger payload shape for key security events).

### Exit Criteria

1. Flags exist and default values are documented.
2. Baseline metrics are captured and published.

---

## Phase 1: Critical Controls

## 1.1 Secret hygiene and key management

### Tasks

1. Enforce boot-time rejection of placeholder/default secrets in non-test environments:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- OAuth signing/encryption secrets
- webhook secrets when related feature is enabled

2. Add key-rotation model with explicit key identity:

- `AUTH_JWT_ACTIVE_KID`
- `AUTH_JWT_KEYS_JSON` (kid -> secret)
- verification supports active + previous keys

3. Add emergency runbook:

- rotate active key
- preserve previous key window
- force session invalidation when required

### Tests (new/updated)

1. Add `backend/src/config.security.test.ts`:

- rejects placeholder secrets in non-test mode
- allows test-mode fixtures only in test mode

2. Extend `backend/src/lib/jwt.test.ts`:

- verifies token with active key
- verifies token with previous key during rotation window
- rejects unknown `kid`
- rejects algorithm mismatch and malformed claims

### Exit Criteria

1. Non-test boot fails on weak/default secrets.
2. Rotation framework is working and test-covered.

---

## 1.2 CSRF/origin enforcement for all cookie-auth mutations

### Tasks

1. Inventory every state-changing route and classify:

- browser cookie-auth mutation
- service-to-service webhook
- explicitly exempted endpoints

2. Apply `requireTrustedOrigin` + `requireCsrf` to all browser cookie-auth mutation routes.
3. Keep explicit exception list in one file with justification comments.
4. Add middleware composition helper for mutation routes to prevent drift.
5. Frontend compatibility requirement:

- mutation client always fetches/attaches CSRF token before unsafe requests.

### Tests (rewrite existing + new)

1. Rewrite route tests to include CSRF + origin assertions:

- `backend/src/routes/subscriptions.test.ts`
- `backend/src/routes/tracked-products.test.ts`
- `backend/src/routes/notifications.test.ts`
- `backend/src/routes/categories-settings.test.ts`
- `backend/src/routes/runs.test.ts` for mutating paths

2. Extend `backend/src/routes/auth.test.ts` to preserve current auth CSRF behavior.
3. Add `backend/src/routes/csrf-mutation-coverage.test.ts`:

- missing token -> `403 csrf_mismatch`
- untrusted origin -> `403 origin_not_allowed`
- exempt webhook path still requires webhook secret and rejects browser-origin misuse

### Exit Criteria

1. All browser cookie-auth mutation routes are covered by CSRF and origin checks.
2. No mutation route bypass exists without explicit exemption.

---

## 1.3 Enforceable infrastructure controls (Redis/Postgres)

### Tasks

1. Convert hardening guidance into enforceable deployment checks:

- fail deploy if Redis/Postgres public exposure is detected in production environment definitions
- fail deploy if Redis auth/TLS requirements are not met
- run checks against source-of-truth manifests or platform API outputs used for production deploys

2. Enforce Redis production policy:

- `rediss://` required
- password or ACL user required

3. Enforce DB credential separation:

- migration role (DDL)
- runtime role (least-privilege DML only)

### Tests

1. Add `backend/src/queue/connection.test.ts`:

- parses `rediss://`, enables TLS, handles auth/user/db index
- rejects unsupported protocols

2. Add config validation tests for production Redis policy.
3. Add CI/deploy check script tests for environment policy linting.

### Exit Criteria

1. Infrastructure hardening is gate-enforced in CI/deploy checks.
2. Runtime DB role split is implemented and documented with rotation playbook.

---

## Phase 2: High Priority AuthZ + Abuse Controls

## 2.1 Authorization freshness for privileged operations

### Tasks

1. Add authz freshness guard with minimal DB hit:

- validate `isActive`
- validate current role for admin-only routes

2. Apply to privileged endpoints first:

- admin routes
- account security mutation routes

3. Performance safeguards:

- only select required columns
- request-scoped cache for repeated checks in same request pipeline

### Tests (new/updated)

1. Add `backend/src/middleware/authz-freshness.test.ts`:

- deactivated user with still-valid token denied
- downgraded admin user denied on admin route

2. Update:

- `backend/src/routes/admin-scheduler-state.test.ts`
- `backend/src/routes/categories-settings.test.ts`
- `backend/src/routes/runs.test.ts` admin trigger path

### Exit Criteria

1. Privileged routes no longer trust stale role/isActive claims in token alone.
2. Latency overhead stays within budget defined in release gates.

---

## 2.2 JWT verification hardening

### Tasks

1. Explicitly pin accepted algorithms in verification.
2. Require claims:

- `iss`, `aud`, `exp`, `sub`, `type`

3. Prepare for token version claim compatibility:

- accept missing `tokenVersion` while enforcement flag is off
- emit telemetry for missing claim during migration window

### Tests

1. Extend `backend/src/lib/jwt.test.ts`:

- rejects `alg:none`
- rejects wrong `type`
- rejects malformed or missing required claims
- handles migration compatibility behavior for optional `tokenVersion`

### Exit Criteria

1. JWT verification behavior is strict and backward-compatible for migration window.

---

## 2.3 Rate-limit anti-bypass improvements

### Tasks

1. Ensure production uses shared Redis-backed rate-limit store.
2. Keep auth mutation limiter strict and add account-aware login attempt limiter.
3. Verify `TRUST_PROXY_HOPS` via deployment topology checklist and runtime validation logging.
4. Add abuse alerts on auth and mutation limiter spikes.

### Tests (new/updated)

1. Extend `backend/src/middleware/rate-limit/index.test.ts`:

- auth-aware and IP-only key behavior
- auth mutation limiter regression
- login account-aware limiter behavior

2. Extend `backend/src/middleware/rate-limit/redis-store.test.ts`:

- fail-open/fail-closed guarantees

### Exit Criteria

1. Rate-limit behavior is resilient to single-node and proxy-bypass style abuse patterns.

---

## Phase 3: Medium Priority Hardening

## 3.1 Enumeration and timing hardening

### Tasks

1. Normalize external auth responses to reduce account-state leakage.
2. Add constant-work path for invalid login branches.

### Tests

1. Update `backend/src/routes/auth.test.ts`:

- parity checks for unknown/wrong-password/inactive policy

2. Add `backend/src/services/auth.enumeration.test.ts`:

- response parity assertions
- timing branch-skew benchmark run in a non-blocking perf job (not unit-test CI gate)

### Exit Criteria

1. User-state leakage via auth responses is materially reduced.

---

## 3.2 Token-version replay mitigation (schema + migration safe rollout)

### Tasks

1. Prisma schema change:

- add `tokenVersion Int @default(0)` to `User`

2. Migration rollout:

- Step 1: add column with default and backfill
- Step 2: backend dual-read (claim optional), dual-write (new tokens include claim)
- Step 3: observe missing-claim telemetry until near-zero
- Step 4: enable enforcement flag
- Step 5: keep additive schema compatibility for at least two releases before any cleanup migration

3. Increment `tokenVersion` for high-risk events:

- password reset
- admin/manual account lock or forced logout-all

4. Rollback plan:

- disable enforcement flag
- keep dual-read compatible behavior

### Tests (rewrite existing + new)

1. Extend `backend/src/services/auth.service.test.ts`:

- version bump invalidates old access token
- password reset revokes refresh sessions and increments version

2. Extend middleware tests:

- token without version accepted when enforcement off
- token without version rejected when enforcement on

3. Add migration integration test if your migration-test harness supports it.

### Exit Criteria

1. Replay mitigation is active with safe forward/backward compatibility.

---

## 3.3 Connection and query resilience

### Tasks

1. Define Prisma/DB pool settings per environment.
2. Add timeout and cancellation strategy for expensive reads.
3. Keep pagination/query-shape constraints tight.

### Tests

1. Add config-level tests for connection setting validation.
2. Keep route/query validation tests as guardrails.

### Exit Criteria

1. Connection exhaustion risk is reduced and configuration is explicit.

---

## Phase 4: Queue Trust Boundary and Operational Completion

## 4.1 Redis/BullMQ trust boundary hardening

### Tasks

1. Validate job payload schema at enqueue and worker boundaries.
2. Restrict who can enqueue sensitive jobs:

- route-level authz
- service-layer allowlist checks

3. Isolate queue namespaces/prefixes by environment.
4. Add enqueue abuse controls:

- per-actor and per-category enqueue throttles

5. Add queue anomaly detection:

- unexpected trigger type spikes
- duplicate job patterns
- worker failure bursts

### Tests

1. Add/extend queue tests:

- invalid payload rejected
- unauthorized enqueue path denied
- duplicate and throttle behavior

### Exit Criteria

1. Queue accepts only validated, authorized, and rate-bounded jobs.

---

## 4.2 Operational lock-in

### Tasks

1. Tighten health endpoint exposure policy for production.
2. Add dashboards and alerts:

- CSRF mismatch spikes
- origin mismatch spikes
- auth 429 bursts
- queue anomaly signals

3. Ensure security suite is mandatory in CI.

### Tests

1. Add smoke assertions for health endpoint response policy.
2. Verify security test groups are included in CI pipeline config.

### Exit Criteria

1. Monitoring and CI continuously enforce security posture.

---

## Test Workstream (Mandatory)

## New backend tests to add

1. `backend/src/config.security.test.ts`
2. `backend/src/routes/csrf-mutation-coverage.test.ts`
3. `backend/src/middleware/authz-freshness.test.ts`
4. `backend/src/services/auth.enumeration.test.ts`
5. `backend/src/queue/connection.test.ts`
6. `backend/src/queue/security.test.ts` (payload validation + enqueue auth/throttle)

## Existing backend tests to rewrite/extend

1. `backend/src/lib/jwt.test.ts`
2. `backend/src/routes/auth.test.ts`
3. `backend/src/routes/subscriptions.test.ts`
4. `backend/src/routes/tracked-products.test.ts`
5. `backend/src/routes/notifications.test.ts`
6. `backend/src/routes/categories-settings.test.ts`
7. `backend/src/routes/runs.test.ts`
8. `backend/src/middleware/rate-limit/index.test.ts`
9. `backend/src/middleware/rate-limit/redis-store.test.ts`
10. `backend/src/services/auth.service.test.ts`

## Frontend compatibility test requirement

1. Add or update frontend auth client tests for CSRF mutation behavior before enabling strict backend mutation CSRF mode.
2. Validate protected route mutation flows under mixed backend/frontend deployment windows.

## Verification commands per slice

1. `npm run lint --workspace=backend`
2. `npm run typecheck --workspace=backend`
3. `npm run test --workspace=backend`
4. `npm run test --workspace=frontend` (required for CSRF/mutation slices)

---

## Quantitative Release Gates

1. Auth route p95 latency regression <= 10% from baseline.
2. No sustained increase in `5xx` on auth/admin/notification mutation paths.
3. `403 csrf_mismatch` rate after CSRF expansion is <= 1.5x baseline within 48 hours and <= 1.2x baseline within 7 days.
4. Queue failure rate p95 remains <= 1.2x baseline and queue lag p95 remains <= 1.2x baseline.
5. No unresolved critical/high regression bugs before moving to next slice.

---

## Risk and Rollback

1. Authz freshness misconfiguration could block valid users.

- Mitigation: feature flag, staged endpoint enablement, rapid disable switch (target rollback under 15 minutes).

2. CSRF expansion could break frontend mutation flows.

- Mitigation: deploy-safe compatibility window and frontend tests required before strict mode enable.

3. Key rotation mistakes could invalidate active sessions.

- Mitigation: active + previous key verification window with staged cutover.

4. Token version rollout could invalidate tokens unexpectedly.

- Mitigation: dual-read/dual-write migration sequence and enforcement flag.

## Feature Flag Retirement

1. Every hardening flag must have:

- owner
- activation date
- target removal date

2. Removal criteria:

- two stable releases after full enablement
- no rollback triggers in the last release window

---

## Definition of Done

1. Slices A-H completed with code, tests, telemetry, and rollback switches.
2. Backend and required frontend test suites pass in CI.
3. Quantitative release gates met for each slice.
4. No unresolved critical/high findings remain from the 2026-03-22 security review.
