# Google OAuth Implementation Plan

## Status

Planned (`March 13, 2026`).

## Target

[documentation/backend/GOOGLE_OAUTH_IMPLEMENTATION.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/documentation/backend/GOOGLE_OAUTH_IMPLEMENTATION.md)

## Summary

Add Google OAuth (OAuth 2.0 + OpenID Connect) for sign up and login while preserving the existing session/cookie auth model. Keep email/password and MFA flows intact.

## Architecture Decisions (Locked)

1. Use Authorization Code Flow with OpenID Connect and PKCE (`S256`) for every Google auth request.
2. Use server-side DB-backed OAuth challenge storage (no client-only challenge state).
3. Make `users.password_hash` nullable and explicitly define behavior for password endpoints when null.
4. Make callback handling idempotent and single-use by challenge consumption.
5. Bind OAuth challenge to browser with signed `HttpOnly` challenge cookie and verify cookie + state + DB challenge together.
6. Enforce fixed frontend redirect allowlist and forbid arbitrary callback redirect targets.
7. Do not auto-link to existing local user unless Google email is verified and local `email_verified_at` is already set.
8. Set strict cache-control and cookie policies for OAuth endpoints.
9. Block OAuth login for `ADMIN` role accounts in v1 (or require explicit elevated step-up in a later phase).
10. If local user has `mfa_enabled=true`, require post-OAuth step-up; if unavailable in v1, block OAuth login for MFA-enabled users.
11. Use a single email canonicalization function for all lookup/link decisions; do not apply provider-specific alias collapsing.
12. Ship behind `AUTH_GOOGLE_OAUTH_ENABLED` and require observability metrics before enabling in production.

## Goals

1. Users can sign up or log in with Google.
2. Existing accounts are linked safely by verified email.
3. Existing auth cookies, refresh token rotation, session management, and CSRF model continue to work.
4. Rollout is controlled with a feature flag.

## Non-Goals (v1)

1. Additional social providers (GitHub, Apple, etc.).
2. Full OAuth provider management UI.
3. Migrating auth stack to a third-party auth framework.

## System Architect Audit

1. `High`: Account takeover risk via unsafe auto-linking.
   Resolution: only auto-link when Google returns `email_verified=true` and email matches normalized local email exactly.
2. `High`: OAuth callback tampering/replay risk (`state`/`nonce` misuse).
   Resolution: store short-lived OAuth challenge (state, nonce, redirect intent), single-use on callback, strict TTL, and constant-time token hash comparison.
3. `High`: Current `users.password_hash` is required and blocks OAuth-only users.
   Resolution: make `password_hash` nullable and explicitly branch logic for password login requirements.
4. `Medium`: MFA policy ambiguity for OAuth users can create bypass confusion.
   Resolution: define policy explicitly for v1: Google login is accepted as primary authentication factor; existing MFA remains for password-based login only.
5. `Medium`: Identity duplication risk with concurrent first logins.
   Resolution: enforce DB uniqueness on `(provider, provider_user_id)` and run create/link flow in transaction with conflict handling.
6. `Medium`: Open redirect / frontend callback abuse risk.
   Resolution: use fixed allowlisted frontend redirect targets, no arbitrary callback URLs from query parameters.
7. `Low`: Observability gaps during rollout.
   Resolution: add structured logs and counters for start/success/failure/link/create outcomes.

## Re-Audit Updates (March 13, 2026)

1. `High`: PKCE requirement was previously implicit.
   Resolution: PKCE `S256` is now mandatory and tested as a hard requirement.
2. `High`: `password_hash` nullability side effects were under-specified.
   Resolution: endpoint behavior matrix added below and covered by tests.
3. `High`: challenge persistence strategy was ambiguous.
   Resolution: DB-backed `OAuthChallenge` selected as the only supported implementation in v1.
4. `Medium`: callback replay/idempotency rules were incomplete.
   Resolution: callback challenge consumption is single-use transactional; reuse is rejected deterministically.
5. `Medium`: observability requirements were vague.
   Resolution: explicit event and metric contract added in rollout requirements.
6. `High`: browser-binding for challenge was missing.
   Resolution: signed `HttpOnly` challenge cookie is now required and validated in callback.
7. `High`: login-CSRF scenario coverage was missing.
   Resolution: add explicit login-CSRF negative tests (missing/mismatched/stolen callback context).
8. `Medium`: OIDC claims checklist was incomplete.
   Resolution: validate `sub`, `azp` (when applicable), algorithm constraints, and clock-skew policy.
9. `High`: Auto-linking could attach to unverified local accounts.
   Resolution: auto-link only when Google email is verified and local `email_verified_at` is set.
10. `Medium`: Cookie security policy was too vague.
    Resolution: lock exact `oauth_challenge` cookie attributes and path scope.
11. `Medium`: Missing key management controls for challenge cookie and verifier encryption.
    Resolution: define signing/encryption key IDs, rotation process, and dual-key validation window.
12. `Medium`: Missing no-store requirement on callback responses.
    Resolution: require no-store/no-cache headers on OAuth callback responses.
13. `Medium`: Sensitive logging redaction policy was not explicit.
    Resolution: ban logging of auth codes/tokens/verifiers/challenge cookie; log only safe metadata.
14. `Low`: Challenge retention policy was missing.
    Resolution: add scheduled cleanup and retention bounds for used/expired challenge records.
15. `High`: MFA-enabled users could bypass second factor via OAuth.
    Resolution: enforce post-OAuth step-up for MFA-enabled users or block OAuth for those users in v1.
16. `Medium`: OAuth on admin accounts increases blast radius.
    Resolution: block OAuth login for admin role in v1 and keep password+MFA-only access for admin.
17. `Medium`: Email normalization requirements were not explicit enough.
    Resolution: lock canonicalization rules and cover with edge-case tests.

## Scope

1. Include:

- Backend auth routes/services/config/schema updates for Google OAuth.
- Frontend login/register entry points for Google auth.
- Callback success/error UX and tests.

2. Exclude:

- New provider support beyond Google.
- Major redesign of auth pages.
- Replacing cookie-based session architecture.

## Proposed Architecture

1. Data model:

- Add `AuthProvider` enum (`GOOGLE`).
- Add `AuthIdentity` model:
    - `id`, `userId`, `provider`, `providerUserId`, `providerEmail`, `createdAt`, `updatedAt`
    - Unique index on `(provider, providerUserId)`
    - Optional index on `(provider, providerEmail)`
- Make `User.passwordHash` nullable for OAuth-only users.

2. OAuth challenge storage:

- Add `OAuthChallenge` model with:
    - `id`, `stateHash`, `nonce`, `codeVerifierEncrypted`, `provider`, `expiresAt`, `usedAt`, `createdByIp`, `userAgent`.
- Single-use and short TTL (for example 10 minutes).
- `codeVerifier` stays server-side only, encrypted at rest, never logged.
- Start endpoint sets signed `HttpOnly` cookie (`oauth_challenge`) carrying challenge binding metadata (`challengeId` + integrity signature).
- Cookie attributes are locked:
    - name: `__Host-oauth_challenge` in production
    - `HttpOnly=true`
    - `Secure=true` in production
    - `SameSite=Lax`
    - `Path=/` (required for `__Host-` prefix compliance)
    - `Max-Age<=600`
- Callback requires all of: valid challenge cookie, matching `state`, and unused non-expired DB challenge.
- Callback responses must include:
    - `Cache-Control: no-store, no-cache, must-revalidate`
    - `Pragma: no-cache`
    - `Expires: 0`
    - `Referrer-Policy: no-referrer`
- Challenge records are purged on schedule (expired and used) with bounded retention (for example 24h for used records).

3. Backend flow:

- `GET /api/auth/oauth/google/start`
    - Create challenge (`state`, `nonce`, `codeVerifier`), persist metadata, set signed `oauth_challenge` cookie, redirect to Google with PKCE challenge.
- `GET /api/auth/oauth/google/callback`
    - Validate challenge (`state`, cookie binding, TTL, unused).
    - Exchange authorization code for tokens with stored PKCE `codeVerifier`.
    - Validate ID token claims:
        - required: `iss`, `aud`, `exp`, `sub`, `nonce`, `email`, `email_verified`.
        - conditional: `azp` must match client id when `aud` has multiple values.
        - enforce accepted signing algorithm list and JWKS key rotation handling.
        - apply bounded clock skew (for example ±300 seconds).
    - Find/create/link local user + `AuthIdentity`.
    - Issue existing auth cookies (`access`, `refresh`) and CSRF cookie.
    - Clear `oauth_challenge` cookie.
    - Redirect to frontend success route.

## Account Linking Policy Matrix (Locked)

1. Existing user found by email, `email_verified=true`, local `email_verified_at` is set, user active, no conflicting Google identity:

- Link to that user and continue login.

2. Existing user inactive/suspended:

- Reject OAuth login and return safe account-state error.

3. Existing user email match but conflicting Google identity already linked to another user:

- Reject and emit security audit event.

4. No existing user by email:

- Create new user + `AuthIdentity` (OAuth-first account).

5. Existing Google identity by `(provider, providerUserId)`:

- Always authenticate that linked user (no relinking).

6. Existing user found by email but local `email_verified_at` is null:

- Do not auto-link. Return safe action-required error and require explicit authenticated link flow (future scope) or verified-email completion.

7. Existing user has `mfa_enabled=true`:

- Require second-factor step-up after OAuth identity validation.
- If step-up flow is not enabled in v1, reject OAuth login with safe action-required error.

8. Existing user has `role=ADMIN`:

- Reject OAuth login in v1 and require existing admin auth flow.

## Email Canonicalization Contract (Locked)

1. Canonicalization is centralized in one utility shared by register/login/password/OAuth link flows.
2. Normalize by:

- trimming surrounding whitespace
- Unicode normalization (NFKC)
- lowercasing domain and local-part with consistent locale-independent rules

3. Do not implement provider-specific alias transformations (for example Gmail dot/plus collapsing).
4. Apply same canonicalization to:

- incoming Google email claim
- local user email lookup path
- uniqueness checks where relevant

5. Add fixture-based tests for mixed-case, Unicode, and whitespace edge cases.

## Password and Recovery Behavior Matrix

1. `POST /api/auth/login`:

- If `password_hash` is null, return generic invalid credentials.

2. `POST /api/auth/password/forgot`:

- Keep generic success response.
- Only issue reset token when `password_hash` is non-null.

3. `POST /api/auth/password/reset`:

- Existing reset flow remains; no token exists for OAuth-only users unless explicitly created.

4. Step-up endpoints using `currentPassword`:

- If `password_hash` is null, `currentPassword` path is invalid.
- Require MFA code or recovery code path instead (or return step-up failure).

## API and Contract Changes

1. New backend routes:

- `GET /api/auth/oauth/google/start`
- `GET /api/auth/oauth/google/callback`

2. Shared types:

- Add OAuth result payload/error codes used by frontend callback route if needed.

## Configuration Changes

1. Backend env vars:

- `AUTH_GOOGLE_OAUTH_ENABLED`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `AUTH_OAUTH_COOKIE_SIGNING_KEY`
- `AUTH_OAUTH_COOKIE_SIGNING_KEY_PREVIOUS` (optional, rotation window)
- `AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY`

2. Frontend env vars (if frontend callback route needs it):

- `VITE_AUTH_GOOGLE_ENABLED`

## Implementation Plan

1. TDD foundation (security-first, before feature code):

- Add failing tests for OAuth security invariants and endpoint behavior matrix.
- Add failing tests for callback replay, state misuse, nonce mismatch, and open redirect blocking.
- Add failing tests for account-linking edge cases and duplicate identity conflicts.
- Add failing tests for login-CSRF protections using missing/mismatched challenge cookie.

2. Prisma and DB layer:

- Add `AuthProvider`, `AuthIdentity`, and challenge model.
- Make `users.password_hash` nullable.
- Generate and apply migration.

3. Backend config and validation:

- Extend config schema with Google OAuth vars and feature flag.

4. OAuth service module:

- Add provider client for Google auth URL generation, code exchange, and ID-token validation.
- Add challenge lifecycle helpers.
- Enforce PKCE `S256` generation and verification path.
- Implement key-aware signing/encryption helpers with active and previous key support for rotation.

5. Auth route/controller integration:

- Implement start/callback handlers.
- Reuse existing session issuance and cookie helpers.
- Consume OAuth challenge transactionally (`usedAt` set once); reject reuse.
- Apply password endpoint behavior matrix for `password_hash` null accounts.
- Enforce locked account-linking policy (including local email verification requirement).
- Enforce MFA/admin OAuth guardrails according to locked policy.
- Set no-store/no-cache headers on callback responses.
- Set `Referrer-Policy: no-referrer` on callback responses to prevent query leakage.

6. Frontend integration:

- Add `Continue with Google` button on login/register pages.
- Add callback result handling route/page and error surface.

7. Hardening:

- Add strict redirect allowlist.
- Add rate limiting for OAuth start/callback endpoints.
- Add audit logging.
- Add secure cookie policy for `oauth_challenge` (`HttpOnly`, `Secure` in prod, bounded `SameSite`, short max-age).
- Add explicit ID token validation module with deterministic error codes.
- Add sensitive-field logging redaction policy for OAuth handlers and HTTP client layer.
- Add scheduled challenge cleanup job and retention SLO.
- Pin OIDC/JWT validation dependencies and include them in security update policy.

8. Documentation:

- Update root README and backend README with Google Cloud Console setup and local redirect URI examples.

## Test Plan

1. TDD workflow:

- Write tests first.
- Confirm tests fail for expected reason.
- Implement minimal code to pass.
- Refactor with tests green.

2. Backend unit tests:

- Challenge create/validate/expire/reuse.
- Token claim validation failures.
- PKCE enforcement (`S256` code challenge and code verifier exchange path).
- Link existing verified-email user.
- Create new OAuth user.
- Duplicate/conflict handling.
- Password endpoint behavior for `password_hash` null users.
- ID token validation tests for `sub` missing, `azp` mismatch, invalid algorithm, invalid issuer/audience, and clock-skew edges.
- Email canonicalization tests for case/Unicode/whitespace and consistency across auth paths.
- Key rotation tests:
    - challenge cookie validates with current key.
    - challenge cookie validates with previous key during rotation window.
    - invalid signature is rejected.

3. Backend route integration tests:

- Start endpoint redirects correctly.
- Callback success sets auth cookies and redirects.
- Callback invalid state/expired challenge returns safe failure.
- Callback replay (same state/challenge reused) is rejected.
- Redirect allowlist blocks untrusted redirect target.
- Rate-limit behavior for repeated abusive callback attempts.
- Login-CSRF defense:
    - callback without `oauth_challenge` cookie is rejected.
    - callback with mismatched challenge cookie/state is rejected.
    - replayed/stolen callback URL in another session is rejected.
- Callback responses include strict no-store/no-cache headers.
- Auto-link blocked when local account email is not verified.
- Existing inactive/suspended user cannot authenticate via OAuth even when Google email is verified.
- Existing admin user cannot authenticate via OAuth (v1 guardrail).
- Existing MFA-enabled user requires step-up or receives blocked response per v1 policy.

4. Frontend tests:

- Google buttons render on login/register.
- Callback success redirects into app.
- Callback failure renders actionable auth error.

5. Security abuse scenarios (must pass before feature flag enable):

- Tampered `state` value.
- Tampered or missing `nonce` claim in ID token.
- Wrong `aud` or `iss` in ID token.
- Unverified Google email (`email_verified=false`).
- Account-link collision and duplicate identity write race.
- Missing `sub` or malformed `azp` claim.
- Missing/invalid browser-bound challenge cookie.
- Forged/tampered challenge cookie signature.
- Attempted auto-link to unverified local account.
- Attempted OAuth login for inactive/suspended local account.
- Attempted OAuth login for admin account.
- Attempted OAuth login for MFA-enabled account without step-up.

6. Threat-model completeness tests:

- Maintain a STRIDE checklist for each OAuth stage (`start`, `callback`, `identity link`, `session issue`).
- Require at least one automated abuse test per identified threat per stage.

7. Property and invariant tests:

- One Google identity maps to exactly one local user across all flows.
- One challenge can only be consumed once.
- Callback cannot succeed without valid browser-bound challenge context.

8. Fuzz and malformed input tests:

- Fuzz callback query (`state`, `code`, unexpected params) and challenge cookie payload.
- Assert deterministic safe failures (no unhandled exceptions, no 500 leakage).

9. Concurrency and race-condition tests:

- Parallel callback requests for same challenge.
- Parallel callback requests for same Google identity and no prior identity row.
- Assert unique identity/user constraints hold and behavior remains deterministic.

10. Time-boundary tests:

- Challenge/token validity at exact boundary conditions (`-1s`, `0s`, `+1s` around expiry).
- Clock-skew acceptance/rejection boundaries for token validation.

11. Key-rotation end-to-end tests:

- Current and previous signing keys both validate during rotation window.
- Previous key rejected after rotation window closes.
- No login outage during controlled key rotation.

12. Observability redaction tests:

- Assert logs and metrics never include auth code, ID/access token, code verifier, raw challenge cookie, or nonce.
- Validate only approved metadata fields are emitted.

13. Rollback and partial-deploy tests:

- Feature flag off disables OAuth entry points safely.
- Schema-forward app-old and app-forward schema compatibility checks.
- Backout path does not break password auth.

14. Misconfiguration and fail-fast tests:

- Invalid/missing OAuth env vars fail startup with actionable error.
- Invalid issuer/audience/redirect configuration blocks runtime auth flow safely.

15. Performance and abuse tests:

- Load-test OAuth start/callback endpoints for acceptable latency under expected peak.
- Verify rate-limits and rejection behavior under abuse-like traffic.

16. Session-security regression tests:

- OAuth login preserves refresh rotation, logout revocation, and CSRF behavior guarantees.
- Ensure no regression in existing non-OAuth auth flows.

17. Incident-drill validation:

- Tabletop and scripted drills for JWKS failure, replay spike, token-validation outage.
- Confirm alert thresholds and operational runbook actions are actionable.

## Acceptance Criteria

1. Google OAuth sign up/login works end-to-end locally and in production.
2. Existing password login and MFA flows continue working.
3. No duplicate users for same Google identity.
4. Auto-linking only happens for verified Google email.
5. OAuth callback replay and invalid state attempts are rejected.
6. PKCE is enforced for Google OAuth start and callback exchange.
7. Endpoint behavior matrix for OAuth-only accounts is implemented and covered by tests.
8. Lint/tests pass across backend and frontend workspaces.
9. Auto-linking is blocked for local accounts without `email_verified_at`.
10. OAuth callback responses are non-cacheable by policy and tests.
11. Sensitive OAuth artifacts are redacted from logs by policy and tests.
12. Extended hardening test suites (threat-model, race, fuzz, boundary, rollback, performance) pass before production enablement.
13. OAuth callback responses enforce `Referrer-Policy: no-referrer`.
14. OAuth login is blocked for inactive/suspended local users.
15. OAuth login is blocked for admin accounts in v1.
16. MFA-enabled users cannot bypass second factor through OAuth.
17. Email canonicalization is deterministic and shared across all auth/link lookup paths.

## Verification Commands

1. `npm run lint --workspace=backend`
2. `npm run test --workspace=backend`
3. `npm run lint --workspace=frontend`
4. `npm run test --workspace=frontend`
5. `npm run test --workspace=backend -- auth.service.test.ts auth.test.ts`
6. `npm run test --workspace=frontend -- auth-routing.test.tsx`

## Rollout and Backout

1. Rollout:

- Deploy schema first.
- Deploy backend with feature flag off.
- Configure Google credentials and redirect URI.
- Confirm required telemetry is present:
    - `oauth_google_start_total`
    - `oauth_google_callback_success_total`
    - `oauth_google_callback_error_total` (with reason tag)
    - `oauth_google_link_existing_total`
    - `oauth_google_create_user_total`
    - `oauth_google_callback_replay_rejected_total`
    - `oauth_google_login_csrf_rejected_total`
- Configure alert thresholds:
    - callback error rate > 5% for 10 minutes.
    - replay/csrf rejection spikes above baseline (for example > 20/hour).
    - identity conflict failures above baseline (for example > 5/hour).
- Enable `AUTH_GOOGLE_OAUTH_ENABLED=true`.

2. Backout:

- Disable feature flag to stop OAuth entry points immediately.
- Keep schema additions in place (non-breaking for existing users).

## Effort Estimate

1. MVP: `2-4` engineering days.
2. Production-ready hardening and full test coverage: `5-8` engineering days.
