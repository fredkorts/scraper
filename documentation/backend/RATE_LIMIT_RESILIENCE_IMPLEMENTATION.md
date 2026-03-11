# RATE_LIMIT_RESILIENCE_IMPLEMENTATION.md

## Status

Implemented (feature-flagged rollout; frontend verification complete, backend DB-backed tests require local Postgres).

## Summary

Address production `429 rate_limit_exceeded` incidents by:

1. adding frontend auth-recovery cooldown/backoff to stop retry storms, and
2. switching backend global API read limiting to user-aware keying for authenticated traffic, while retaining strict anti-abuse controls.

## Problem Statement

Users intermittently hit:

1. `Too many requests, please try again later`
2. route-loader error cascades after auth refresh failures.

Current architecture contributes:

1. global `/api` limiter is applied before route-level auth guards, so keying is mostly IP-based;
2. shared IP/NAT environments can burn one bucket across multiple users;
3. frontend auth bootstrap can repeatedly attempt recovery after terminal `429` states;
4. multi-tab sessions can amplify retry volume if cooldown state is tab-local only.

## Goals

1. Keep security posture unchanged (no CSRF/origin relaxations).
2. Reduce false-positive 429s for legitimate authenticated usage.
3. Prevent refresh/bootstrap retry storms.
4. Keep behavior deterministic, observable, and rollback-safe.

## Non-Goals

1. Blindly raising rate-limit thresholds as primary mitigation.
2. Disabling strict auth mutation limits.
3. Moving auth tokens to client storage.

## Locked Decisions

1. `auth-mutation` limiter stays strict and IP-centric.
2. Add lightweight optional auth hydration before global `/api` read limiter.
3. Global read key strategy:
    - valid authenticated request: `user:<userId>`
    - otherwise: `ip:<ipKey>`
4. Add authenticated IP safety ceiling (higher limit) in addition to user bucket.
5. Frontend cooldown applies to auth bootstrap/recovery paths only.
6. Cooldown honors `Retry-After` when present; fallback fixed window otherwise.
7. Bootstrap `GET /api/auth/me` `429` must be handled explicitly (no crash loops).
8. Rollout uses feature flags for backend keying and frontend cooldown.

## Feature Flags

1. Backend:
    - `RATE_LIMIT_USER_KEYING_ENABLED=false` (default)
    - `RATE_LIMIT_AUTHENTICATED_IP_CEILING_LIMIT=1200` (default, per 15m window)
2. Frontend:
    - `VITE_AUTH_RECOVERY_COOLDOWN_ENABLED=false` (default)

## Architecture Changes

## Backend: User-Aware Read Limiting

1. Add optional auth middleware:
    - reads access-token cookie if present,
    - verifies token,
    - sets `req.auth` when valid,
    - never throws (fail open to unauthenticated path).
2. Middleware order:
    - parsers/context
    - optional auth hydrate
    - global `/api` read limiter
    - existing route handlers and `requireAuth`.
3. Global read limiter key uses `req.auth.userId` when present, otherwise IP.
4. Add authenticated IP safety-ceiling limiter to bound concentration abuse.
    - Composition for authenticated read traffic:
        1. evaluate user bucket first (`api-read` keyed by `user:<id>`),
        2. evaluate authenticated IP ceiling second (`api-authenticated-ip-ceiling` keyed by IP).
    - If either exceeds, request is rejected with `429`.
5. Keep `auth-mutation` limiter independent and unchanged.
6. Keep response contract stable: `error`, `message`, `retryAfterSeconds`, `limiter`.

## Backend: Proxy/IP Correctness

1. Keep `TRUST_PROXY_HOPS` configurable.
2. Add explicit runbook to derive and verify correct hops for Railway/Vercel topology.
3. Add startup observability fields for trust-proxy mode and effective client-IP behavior.
4. Do not hardcode `1` without verification.

## Frontend: Cooldown/Retry Guardrails

1. Add in-memory auth-recovery cooldown in API client:
    - `authRecoveryCooldownUntilMs`
    - `lastRateLimitMeta` (diagnostics).
2. On refresh `429 rate_limit_exceeded`:
    - parse `retryAfterSeconds`,
    - set cooldown,
    - skip further refresh attempts until cooldown expires.
3. Handle bootstrap `/api/auth/me` `429` explicitly:
    - no immediate `/me`+refresh loops,
    - controlled error path and bounded retry behavior.
    - UX contract:
        1. if cached session exists, keep user in-app with stale session and show one warning notification;
        2. if no cached session exists, resolve bootstrap as unauthenticated (`null`) and redirect to login without error boundary crash.
4. Sync cooldown across tabs using auth event channel (or localStorage event fallback).
5. Deduplicate user notifications for cooldown windows.
6. Reset cooldown on successful auth transitions and explicit auth-client reset.

## Operational Guardrails

1. Optional auth hydration must not perform DB queries.
2. Measure p95/p99 API latency before and after rollout.
3. Define rollback threshold (for example sustained >10% p95 regression).
4. Keep retry guard strictly bounded to prevent unbounded loops.

## File-Level Plan

## Backend

1. `backend/src/middleware/auth.ts`
    - add `hydrateAuthOptional`.
2. `backend/src/app.ts`
    - apply optional auth middleware before `app.use("/api", apiReadLimiter)`.
3. `backend/src/middleware/rate-limit/index.ts`
    - user-aware keying for global read limiter,
    - add authenticated IP safety-ceiling limiter.
4. `backend/src/config.ts`
    - add feature flag for user-aware keying mode (default off for rollout).
5. `documentation/backend/RAILWAY_DEPLOYMENT_RUNBOOK.md`
    - add trust-proxy derive/verify checklist.

## Frontend

1. `frontend/src/lib/api/client.ts`
    - cooldown state, `429` parsing, refresh/me guardrails.
2. `frontend/src/features/auth/queries.ts`
    - deterministic bootstrap handling for cooldown/rate-limit states.
3. `frontend/src/features/auth/auth-events.ts`
    - cooldown event broadcast/sync across tabs.
4. `frontend/src/shared/notifications/request-tracker.ts` and notification hooks
    - dedupe cooldown notifications.
5. `frontend/src/lib/api/errors.ts`
    - preserve `rate_limit_exceeded` metadata for UI flow.
6. frontend config/bootstrap
    - add feature flag for cooldown behavior.

## Security Considerations

1. Do not bypass rate limits for auth mutations.
2. Do not trust user IDs from headers/query.
3. Optional auth hydration may set `req.auth` only from verified JWT payload.
4. Keep CSRF/origin checks unchanged.
5. Keep Redis limiter failure modes unchanged.
6. Keep authenticated IP safety ceiling enabled.

## Observability Contract

1. 429 logs/metrics must include:
    - `limiter`
    - `key_type` (`user` | `ip`)
    - `endpoint_group`
    - `status`
    - `retry_after_seconds`
    - `auth_mode` (`bootstrap` | `standard`, frontend-derived where relevant)
2. Alerts:
    - surge in `auth-mutation` 429 (attack signal),
    - sustained authenticated `api-read` 429 after rollout.

## Testing Plan

## Backend Tests

1. Global read limiter uses user key when valid auth cookie exists.
2. Global read limiter falls back to IP when token missing/invalid.
3. Authenticated IP safety-ceiling limiter enforcement test.
4. Auth mutation limiter behavior unchanged.
5. Middleware order test (optional auth before read limiter).
6. Optional auth middleware does not perform DB access.
7. Trust-proxy/IP regression coverage where feasible.

## Frontend Tests

1. Refresh `429` sets cooldown and blocks immediate retries.
2. Cooldown expiry permits retry again.
3. Bootstrap `/api/auth/me` `429` does not create route error-boundary loops.
4. Notification dedupe emits one cooldown message per window.
5. Multi-tab cooldown sync prevents parallel refresh storms.
6. Non-bootstrap requests keep existing error semantics.

## Manual Validation

1. Production smoke: normal navigation does not trigger 429 cascade.
2. NAT/shared-IP smoke: two accounts active, reduced false-positive `api-read` collisions.
3. Auth-hardening regression: invalid login still constrained.
4. Proxy validation: verify effective client IP with current `TRUST_PROXY_HOPS`.
5. Multi-tab validation: concurrent tabs share cooldown behavior.

## Rollout Strategy

1. Deploy backend with feature flag disabled.
2. Enable backend user-aware keying flag, monitor 429/latency metrics.
3. Deploy frontend cooldown feature with flag disabled.
4. Enable frontend cooldown flag, monitor auth-recovery behavior.
5. Rollback paths:
    - disable backend user-aware keying flag,
    - disable frontend cooldown flag.

## Acceptance Criteria

1. No repeated refresh/bootstrap storm after auth-recovery `429`.
2. Bootstrap `/api/auth/me` `429` is graceful (no route-crash loop).
3. Authenticated users on shared IPs see fewer false-positive `api-read` 429s.
4. Login/auth mutation brute-force protection remains unchanged.
5. Existing auth/CSRF tests pass.
6. Multi-tab sessions do not create parallel refresh storms during cooldown.
7. API latency impact from optional auth hydration is within agreed SLO threshold.

## Verification Commands

1. `npm run lint --workspace=backend`
2. `npm run test --workspace=backend`
3. `npm run lint --workspace=frontend`
4. `npm run test --workspace=frontend`
5. `npm run build --workspace=frontend`

## Verification Notes

1. `npm run lint --workspace=backend` passed.
2. `npm run test --workspace=backend` is blocked in this environment because local Postgres is unavailable (`localhost:5432`).
3. `npm run lint --workspace=frontend` passed.
4. `npm run test --workspace=frontend` passed.
5. `npm run build --workspace=frontend` passed.
