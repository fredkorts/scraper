# CSRF_SESSION_RESILIENCE_IMPLEMENTATION.md

## Status

Implemented (verification complete for frontend and backend lint; backend DB-backed tests require a running local Postgres instance).

## Problem Statement

Users intermittently hit `CSRF token mismatch` after refresh/navigation, and frontend route loaders can fail hard when the session refresh path throws.  
Firefox privacy protections (including bounce-tracker state purge) can amplify this by clearing cookies unexpectedly.

## Goals

1. Keep CSRF protection strong (no security downgrade).
2. Make auth/session recovery resilient to cookie churn and browser privacy behavior.
3. Prevent route-level hard crashes when refresh fails.
4. Standardize local/prod origin/cookie behavior to avoid fragile cross-origin cookie setups.

## Non-Goals

1. Removing CSRF from auth mutations.
2. Moving access/refresh tokens to `localStorage` or `sessionStorage`.
3. Relaxing origin checks to wildcard behavior.

## Current Risks

1. Refresh path (`POST /api/auth/refresh`) requires both CSRF cookie + header, but frontend recovery on mismatch is not graceful enough.
2. Single `FRONTEND_URL` origin check is brittle across local/staging/prod variants.
3. Cross-origin deployment (different frontend/API hosts) increases browser cookie edge cases.
4. Route loader bootstrap can surface session/CSRF transport errors as full-page error boundaries.

## Security Constraints (Must Keep)

1. `requireTrustedOrigin` remains mandatory for state-changing auth endpoints.
2. `requireCsrf` remains mandatory for refresh/logout and authenticated mutations.
3. Cookies in production remain `Secure`; no insecure fallback.
4. No client-side token persistence outside cookies.

## Architecture Decisions

1. Prefer same-site architecture:
    - Production: frontend and API under same site (`*.pricepulse.site`) or frontend reverse proxy for `/api`.
    - Local: use one canonical host (`localhost` only), avoid mixing with `127.0.0.1`.
2. Use one origin source of truth:
    - Parse one backend allowlist config (`FRONTEND_ORIGINS`) and reuse it for both CORS and `requireTrustedOrigin`.
    - Do not keep separate independent origin configs for CORS and CSRF origin checks.
3. Add explicit cookie policy config:
    - Introduce `AUTH_COOKIE_SAMESITE` (`strict|lax|none`) with validation.
    - If `none`, enforce `Secure=true`.
4. Expand trusted origin model:
    - Replace single `FRONTEND_URL` comparison with allowlist (`FRONTEND_ORIGINS`).
    - Normalize and compare exact origins.
5. Improve frontend session bootstrap resilience:
    - Retry refresh once after re-bootstrap of CSRF token.
    - If still unauthorized, treat as signed-out path (not fatal route error).
    - Do not silently downgrade all `403` responses to signed-out behavior.
6. Prevent CSRF token staleness from transport caching:
    - `/api/auth/csrf` responses must be non-cacheable (`Cache-Control: no-store`).
    - Frontend CSRF bootstrap fetch must use non-cache mode.
7. Preserve valid sessions across expired access tokens during bootstrap:
    - Auth bootstrap must not treat `/api/auth/me` `401` as terminal before a refresh attempt.
    - Perform one refresh attempt + one `/me` retry in bootstrap flow before signed-out fallback.

## Implementation Plan

## Phase 1: Configuration Hardening

1. Backend config:
    - Add `FRONTEND_ORIGINS` (comma-separated) and parse into normalized origin allowlist.
    - Keep compatibility: if only `FRONTEND_URL` exists, derive allowlist with one value.
    - Add shared `getTrustedOrigins()` helper used by CORS and CSRF origin middleware.
2. Cookie config:
    - Add `AUTH_COOKIE_SAMESITE` env handling.
    - Validate `AUTH_COOKIE_SAMESITE=none` requires production `secure` cookies.
3. Middleware:
    - Update `requireTrustedOrigin` to allow any configured trusted origin.
    - Keep exact-origin checks; no pattern wildcards.
4. Error-code clarity:
    - Return distinct app error code for CSRF mismatch (for example `csrf_mismatch`) instead of generic `forbidden`.
    - Keep origin rejections as separate code (for example `origin_not_allowed`).
5. CSRF endpoint caching policy:
    - Set explicit `Cache-Control: no-store` (and `Pragma: no-cache`) for `/api/auth/csrf`.
    - Verify CDN/proxy layers do not cache that endpoint.

## Phase 2: Frontend CSRF/Session Recovery

1. In API client refresh flow:
    - On refresh `403` with `csrf_mismatch`, force `fetchCsrfToken()`, retry refresh once.
    - Fetch CSRF with `cache: "no-store"` and bypass stale browser/proxy cache.
2. Failure fallback:
    - If refresh still fails with `401`, return signed-out behavior for auth bootstrap paths.
    - If refresh fails with `403` and non-CSRF code (for example `origin_not_allowed`), surface error path and log; do not auto-sign-out fallback.
    - Prevent loader hard-crash for expected auth-expired states.
    - Scope this fallback strictly to auth bootstrap (`ensureSession`/protected-route bootstrap), not all generic API calls.
    - Define explicit request mode contract in frontend client (for example `authMode: "bootstrap" | "standard"`):
        - `bootstrap`: allow refresh/recovery and signed-out fallback on terminal `401`.
        - `standard`: preserve current behavior; do not silently downgrade non-bootstrap API errors.
    - Define explicit callsite mapping for `authMode`:
        - `bootstrap`: session bootstrap paths only (`ensureSession`, protected-route `beforeLoad`, initial auth gate).
        - `standard`: all feature/data queries and mutations outside auth bootstrap.
        - Add lint/checklist item in PR template to validate new auth-related requests choose the correct mode.
3. Keep mutation safety:
    - Continue attaching CSRF header only for mutations.
    - Keep existing mutation-level one-time CSRF recovery retry.
4. React Query/session cleanup contract:
    - On confirmed signed-out fallback, set `queryKeys.auth.me()` to `null`.
    - Cancel in-flight protected queries before cleanup to prevent stale repopulation.
    - Remove/clear protected query caches (`dashboard`, `runs`, `changes`, `settings`) to prevent stale protected data rendering.
    - Broadcast auth event to synchronize tabs.
5. CSRF client cache lifecycle:
    - Reset in-memory CSRF token cache on logout and confirmed signed-out fallback.
    - Re-hydrate CSRF token cache after successful auth establishment (login/register/refresh).
6. Concurrency and retry guardrails:
    - Keep single-flight refresh promise for concurrent loader requests.
    - Keep single-flight CSRF bootstrap promise.
    - Enforce max one CSRF-recovery retry per request path to avoid retry loops.
    - Reset in-memory retry state (`refreshPromise`, `csrfPromise`, and related bootstrap retry guards) after terminal failure so stale failed state cannot poison subsequent auth attempts.
7. Explicit bootstrap `/me` handling:
    - On bootstrap `/api/auth/me` `401`, run refresh recovery flow, then retry `/me` once.
    - Only after both fail, resolve signed-out (`null`) for bootstrap.
8. UX path for origin/security misconfiguration:
    - For `403 origin_not_allowed` during bootstrap, route to a dedicated non-retrying auth configuration error view (not generic error boundary).
    - Provide actionable guidance text (domain mismatch, check frontend/backend origin config).

## Phase 3: Same-Site Serving Strategy

1. Local:
    - Configure Vite dev proxy `/api -> http://localhost:3001`.
    - Set frontend API base to same-origin path (`/api`) for local dev.
    - Enforce one local host (`localhost`) across frontend URL, backend `FRONTEND_ORIGINS`, and browser session.
2. Production:
    - Prefer frontend edge rewrite/proxy for `/api/*` to backend service.
    - Keep cookies first-party from browser perspective.
3. Env strategy:
    - Frontend: use `VITE_API_BASE_URL=/api` in environments where proxy/rewrite is enabled.
    - Backend: set `FRONTEND_ORIGINS` to all expected browser origins (for example apex + `www`).
    - Add deployment checklist step verifying frontend API base is not an unintended absolute cross-origin URL.
4. Config precedence:
    - `FRONTEND_ORIGINS` is authoritative when present.
    - `FRONTEND_URL` is fallback only when `FRONTEND_ORIGINS` is absent.
    - Emit startup warning when both are set and disagree.

## Phase 4: Tests and Verification

1. Backend tests:
    - Trusted-origin allowlist accepts configured origins, rejects others.
    - CSRF mismatch remains blocked.
    - CORS uses the same allowlist and rejects unknown origins with credentials.
    - Distinct error codes are returned for `csrf_mismatch` vs origin rejection.
    - Cookie option validation catches insecure combos.
2. Frontend tests:
    - Simulate missing/stale CSRF cookie during refresh; verify single recovery retry.
    - Verify refresh `401` resolves to signed-out state without global error boundary crash.
    - Verify refresh `403 csrf_mismatch` retries once and then succeeds when CSRF is re-issued.
    - Verify refresh `403 origin_not_allowed` does not silently convert to signed-out state.
    - Verify bootstrap `/api/auth/me` `401` triggers refresh + `/me` retry and restores authenticated state when refresh is valid.
    - Verify protected-route `beforeLoad` redirects to `/login` after confirmed signed-out fallback.
    - Verify stale protected query caches are cleared on signed-out fallback.
    - Verify protected query cancellation occurs before cache cleanup on signed-out fallback.
    - Verify two concurrent protected-route loader requests trigger one refresh single-flight path.
    - Verify auth bootstrap fallback does not affect non-bootstrap API error handling.
    - Verify route `beforeLoad` behavior for `/app`, `/login`, and `/register` under:
        - expired access token + valid refresh,
        - refresh `403 csrf_mismatch`,
        - refresh `403 origin_not_allowed`.
    - Verify origin misconfiguration path renders dedicated auth configuration error view (no retry loop).
3. Manual validation matrix:
    - Chrome + Firefox + Safari/WebKit, fresh session + hard refresh, local + production domains.
    - Include host-mismatch negative test (`localhost` vs `127.0.0.1`) in local validation.

## Security Pitfalls to Avoid

1. Do not exempt `/api/auth/refresh` from CSRF checks.
2. Do not set `Access-Control-Allow-Origin: *` with credentials.
3. Do not disable `Secure` cookies in production.
4. Do not suppress all `403` into silent success; preserve auditability and explicit auth state transitions.
5. Do not trust `Referer` alone when `Origin` is present.
6. Do not leave CORS and CSRF origin logic on separate config sources.

## Rollout Plan

1. Ship config + middleware changes first (backward-compatible env support).
2. Ship frontend recovery logic second.
3. Enable same-site proxy routing in local and production.
4. Monitor auth failures by code:
    - `origin_not_allowed`,
    - `csrf_mismatch`,
    - `unauthorized`.
5. Add rollback switch:
    - Keep previous `FRONTEND_URL` fallback active during transition to `FRONTEND_ORIGINS`.
    - Roll back frontend CSRF retry behavior by feature flag/env guard if unexpected auth regressions appear.
6. Mixed-version compatibility window:
    - Support temporary backend/frontend version skew during phased deploys.
    - Backend should preserve compatibility for old/new client error-code handling during rollout window.
    - Only remove fallback compatibility after both services are confirmed on target versions.

## Acceptance Criteria

1. Hard refresh does not produce route-level crash on session expiry/CSRF churn.
2. CSRF mismatch remains blocked for unsafe requests when tokens do not match.
3. Auth bootstrap gracefully redirects to login on `401` recovery failure.
4. Auth bootstrap does not silently swallow origin/security misconfiguration `403` failures.
5. Local dev works consistently without host-mixing cookie issues.
6. Production no longer shows recurring CSRF mismatch due to cross-origin cookie fragility.

## Verification Commands

1. `npm run lint --workspace=backend`
2. `npm run test --workspace=backend`
3. `npm run lint --workspace=frontend`
4. `npm run test --workspace=frontend`
5. `npm run build --workspace=frontend`

## Verification Notes

1. `npm run lint --workspace=backend` passed.
2. `npm run test --workspace=backend` is blocked in environments without local Postgres (`localhost:5432`).
3. `npm run typecheck --workspace=frontend` passed.
4. `npm run lint --workspace=frontend` passed.
5. `npm run test --workspace=frontend` passed.
6. `npm run build --workspace=frontend` passed.
