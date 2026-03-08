# Auth Hardening Implementation Plan

## Status

Implemented (initial hardening rollout complete).

## Summary

Implement four missing auth capabilities across backend, shared contracts, and frontend:

1. Email verification before full account activation.
2. Password reset flow (`forgot password` + `reset password`).
3. Optional MFA (TOTP) with backup recovery codes.
4. User-facing session/device management.

This plan extends the current cookie + JWT access token + rotating refresh token model.

## Goals

1. Raise account security and abuse resistance without breaking current auth architecture.
2. Keep rollout incremental and reversible.
3. Preserve current cookie/session behavior and route-guard patterns.
4. Provide clear UX for security-critical actions with strong auditability.

## Non-Goals

1. Social login / SSO.
2. WebAuthn/passkeys (future phase).
3. Replacing refresh-token architecture.

## Current State

1. Register/login/refresh/logout/me are implemented.
2. Refresh token rotation and reuse detection are implemented.
3. No email verification.
4. No password reset.
5. No MFA.
6. No session management UI.

## Architectural Decisions (Locked)

1. Keep access tokens in HTTP-only cookie and refresh token rotation unchanged.
2. Add dedicated token tables for each one-time flow:
    1. email verification tokens
    2. password reset tokens
3. Store all one-time tokens hashed at rest.
4. Add session metadata on refresh tokens instead of introducing a new sessions table.
5. MFA uses TOTP (RFC 6238) and hashed backup codes.
6. All state-changing auth endpoints require CSRF protection in addition to cookie auth.
7. Security-sensitive frontend flows must not store secrets in URL/query/localStorage/sessionStorage.

## CSRF Protection (Required)

1. Implement CSRF double-submit token pattern for cookie-auth mutation endpoints.
2. Backend:
    1. issue CSRF cookie on bootstrap/auth-me response.
    2. use fixed CSRF contract:
        1. cookie name: `csrf_token`
        2. header name: `X-CSRF-Token`
        3. cookie attributes: `Secure` in production, `Path=/`, and explicit `SameSite` based on deploy topology.
        4. token rotation on register/login/refresh and at least daily.
    3. require matching `X-CSRF-Token` header for all auth mutations (`POST`, `PATCH`, `DELETE`).
    4. reject missing/invalid CSRF with consistent `403` response.
    5. enforce trusted `Origin`/`Referer` checks for auth mutation endpoints.
3. Frontend:
    1. API client reads CSRF token from safe cookie and sends `X-CSRF-Token` header on mutations.
    2. no mutation endpoint should bypass CSRF middleware.

## Feature 1: Email Verification

### Behavior

1. Registration creates user in unverified state.
2. System sends verification email with one-time link token.
3. User visits verification link, backend validates token, marks email verified.
4. Re-verification emails can be requested with throttling.

### Data Model

Add to `User`:

1. `emailVerifiedAt DateTime? @map("email_verified_at")`

Add `EmailVerificationToken` model:

1. `id`
2. `userId`
3. `tokenHash` (unique)
4. `expiresAt`
5. `usedAt`
6. `createdAt`

### API Endpoints

1. `POST /api/auth/email-verification/resend`
2. `POST /api/auth/email-verification/verify` (token in body)

### Frontend Token Handling Rules

1. Verification/reset tokens may arrive via URL only for first entry.
2. Frontend must immediately exchange token and scrub URL (`replaceState` / router replace).
3. Tokens must never be logged, stored in analytics events, or persisted in client storage.
4. Token pages must explicitly handle:
    1. invalid token
    2. expired token
    3. already-used token
    4. malformed token
5. Each failure state must provide safe recovery CTA (`Resend link`, `Request new reset link`).

### Access Policy

1. Unverified users can sign in.
2. Sensitive actions require verified email:
    1. adding/updating notification channels
    2. payment/plan actions
    3. admin actions

## Feature 2: Password Reset

### Behavior

1. `forgot password` accepts email and always returns generic success.
2. If account exists and active, send one-time reset link token.
3. `reset password` validates token and new password policy.
4. On successful reset:
    1. update password hash
    2. revoke all active refresh tokens for user (global logout)
    3. mark reset token used
    4. clear sensitive client caches and force re-auth across tabs/devices

### Data Model

Add `PasswordResetToken` model:

1. `id`
2. `userId`
3. `tokenHash` (unique)
4. `expiresAt`
5. `usedAt`
6. `createdAt`

### API Endpoints

1. `POST /api/auth/password/forgot`
2. `POST /api/auth/password/reset`

## Feature 3: MFA (TOTP + Backup Codes)

### Behavior

1. MFA is optional and user-enabled.
2. Setup flow:
    1. user starts MFA setup
    2. backend generates TOTP secret + otpauth URI
    3. user confirms with valid code
    4. backend enables MFA and issues backup codes (one-time display)
3. Login flow:
    1. password valid -> MFA challenge required if enabled
    2. user submits TOTP code (or backup code)
    3. only then issue session cookies

### Step-up Authentication (Required)

Require recent-auth confirmation (password or valid MFA challenge) for:

1. `POST /api/auth/mfa/disable`
2. `POST /api/auth/mfa/recovery-codes/regenerate`
3. `DELETE /api/auth/sessions/:id`
4. `POST /api/auth/sessions/revoke-others`

### Account Recovery (Required)

1. Define formal recovery flow for users who lose both MFA device and recovery codes.
2. Recovery controls:
    1. manual verification checklist
    2. cooldown period before MFA reset finalization
    3. full audit logging
    4. user-facing security notifications on recovery start/completion
3. No self-serve bypass for this scenario.

### Data Model

Add to `User`:

1. `mfaEnabled Boolean @default(false) @map("mfa_enabled")`
2. `mfaSecretEncrypted String? @map("mfa_secret_encrypted")`
3. `mfaEnabledAt DateTime? @map("mfa_enabled_at")`

Add `MfaRecoveryCode` model:

1. `id`
2. `userId`
3. `codeHash`
4. `usedAt`
5. `createdAt`

Add temporary `MfaLoginChallenge` model:

1. `id`
2. `userId`
3. `challengeTokenHash`
4. `expiresAt` (short TTL, e.g. 10m)
5. `usedAt`
6. `createdAt`

### API Endpoints

1. `POST /api/auth/mfa/setup/start`
2. `POST /api/auth/mfa/setup/confirm`
3. `POST /api/auth/mfa/disable`
4. `POST /api/auth/mfa/recovery-codes/regenerate`
5. `POST /api/auth/login` (returns challenge-required payload when MFA enabled)
6. `POST /api/auth/mfa/verify-login`

### Security Controls

1. Encrypt MFA secret with app-level encryption key, never store plaintext.
2. Recovery codes are hashed, not reversible.
3. Strict rate limits on MFA verification attempts.
4. Challenge tokens are one-time and short-lived.

## Feature 4: Session/Device Management

### Behavior

1. User can list active sessions/devices.
2. User can revoke:
    1. a single session
    2. all other sessions
3. Current session can be identified in UI.
4. Destructive revoke actions require explicit confirmation UX:
    1. confirmation modal for revoke actions
    2. warning copy for current-session revoke
    3. disabled repeated submission while mutation is pending

### Data Model

Extend `RefreshToken`:

1. `lastUsedAt DateTime? @map("last_used_at")`
2. `createdByIp String? @map("created_by_ip")`
3. `createdByUserAgent String? @map("created_by_user_agent")`
4. `label String?` (optional friendly name; future)

### API Endpoints

1. `GET /api/auth/sessions`
2. `DELETE /api/auth/sessions/:id`
3. `POST /api/auth/sessions/revoke-others`

## Token Lifecycle Maintenance (Required)

1. Add scheduled cleanup job for expired/used auth tokens:
    1. `EmailVerificationToken` where `expiresAt < now()` or `usedAt IS NOT NULL`
    2. `PasswordResetToken` where `expiresAt < now()` or `usedAt IS NOT NULL`
    3. `MfaLoginChallenge` where `expiresAt < now()` or `usedAt IS NOT NULL`
2. Cleanup job should run at least daily and emit cleanup counts to logs.

## Shared Contracts

Update `shared/src/index.ts` with:

1. Email verification state on auth user payload.
2. Password reset request/confirm payloads.
3. MFA challenge/setup/verify payloads.
4. Session list/revoke payloads.

## Frontend Scope

Add pages/routes:

1. `ForgotPasswordPage`
2. `ResetPasswordPage`
3. `EmailVerificationPage` (token handling + states)
4. `SecuritySettings` section in settings:
    1. email verification status + resend
    2. MFA setup/disable/recovery codes
    3. active sessions table + revoke actions

UI/UX constraints:

1. Reuse shared components (`AppButton`, `AppTabs`, table, notifications).
2. Use URL-backed state where relevant.
3. Never expose whether an email exists on forgot-password flow.
4. Do not place secrets/challenge tokens/recovery codes in URL search params.
5. Do not persist auth secrets in localStorage/sessionStorage.
6. Use neutral error copy for verification/reset/MFA failures (no account/token existence hints).
7. Surface explicit success/failure feedback for MFA and session revoke actions.

## Client Session Consistency (Required)

1. On password reset, logout, revoke-others, or current-session revocation:
    1. clear auth-related React Query cache immediately.
    2. broadcast auth state change across tabs (BroadcastChannel or storage event fallback).
    3. redirect to login with neutral message.
2. Session management UI must handle revoked-current-session by hard sign-out.

## Backward Compatibility and Rollout

### Deploy Order (Locked)

1. Deploy backend with additive schema + endpoints first.
2. Run migrations.
3. Deploy frontend consuming new endpoints.

### Feature Flags

Add runtime flags:

1. `AUTH_REQUIRE_VERIFIED_EMAIL` (default off for migration period).
2. `AUTH_ENABLE_MFA` (default off until setup tested).
3. `AUTH_ENABLE_SESSION_MANAGEMENT` (default on after backend deploy).

### Migration Strategy

1. Existing users:
    1. keep `emailVerifiedAt = null` initially.
2. Optional one-time script:
    1. mark currently active paid/admin users verified if business-approved.

## Testing Plan

## Backend

1. Unit tests:
    1. token hashing and expiry guards
    2. TOTP verification window behavior
2. Service tests:
    1. register -> verification token generation
    2. verify token success/failure/expired/reused
    3. forgot/reset with generic response and global session revocation
    4. MFA setup/confirm/disable/recovery-code usage
    5. session list/revoke and revoke-others
3. Route tests:
    1. status codes and payload shapes
    2. rate limiting on sensitive endpoints
    3. CSRF enforcement on mutation endpoints
    4. step-up auth enforcement on high-risk endpoints
    5. trusted `Origin`/`Referer` enforcement on auth mutation endpoints

## Frontend

1. Route tests for new pages and security settings.
2. Form validation and success/error notification behavior.
3. MFA login challenge flow.
4. Session revoke actions with optimistic/refresh behavior.
5. URL token scrubbing tests for verification/reset pages.
6. Cross-tab sign-out/invalidation behavior tests.
7. Neutral error copy tests for forgot/verify/reset/MFA challenge failures.
8. Invalid/expired/used token UX-state tests for verification/reset pages.
9. Confirmation flow tests for session revoke actions.

## Operations and Monitoring

Track metrics/log events:

1. `auth_register_total`, `auth_login_success_total`, `auth_login_failure_total`
2. `auth_email_verification_sent_total`, `auth_email_verification_success_total`
3. `auth_password_reset_requested_total`, `auth_password_reset_success_total`
4. `auth_mfa_challenge_total`, `auth_mfa_verify_success_total`, `auth_mfa_verify_failure_total`
5. `auth_sessions_revoked_total`

Add alerting for:

1. abnormal login failure spikes
2. abnormal MFA failure spikes
3. password reset abuse spikes
4. CSRF rejection spikes (possible attack or client regression)

Abuse controls:

1. Add CAPTCHA/risk challenge hooks on public endpoints when abuse thresholds are exceeded:
    1. register
    2. forgot password
    3. email verification resend

User-facing security notifications (required):

1. New login from new device/session.
2. Password reset completed.
3. MFA enabled.
4. MFA disabled.
5. Recovery code used.
6. Account recovery initiated/completed.

## Acceptance Criteria

1. Email verification flow works end-to-end with secure token handling.
2. Password reset flow works end-to-end and revokes active sessions on reset.
3. MFA setup and login challenge work end-to-end with recovery codes.
4. Session/device management allows listing and revoking sessions.
5. New auth flows pass lint/test/build in backend and frontend.
6. CSRF protection is enforced on all auth mutation endpoints.
7. Security-sensitive pages scrub URL tokens and never persist secrets client-side.
8. Step-up auth is required for MFA-disable/recovery-regenerate/session-revoke operations.
9. Cross-tab session invalidation works for password reset/logout/revoke scenarios.
10. Trusted `Origin`/`Referer` checks are enforced for auth mutation endpoints.
11. Verification/reset pages provide clear expired/invalid/used token recovery UX.
12. User-facing security notifications are emitted for critical account events.

---

## Systems Architect Audit (Plan Review)

### Findings

1. High: Operational lockout risk if `AUTH_REQUIRE_VERIFIED_EMAIL` is enabled too early.
    1. Mitigation: staged rollout with explicit migration period and admin bypass policy.
2. High: MFA secret handling requires encryption key management discipline.
    1. Mitigation: mandatory `AUTH_MFA_ENCRYPTION_KEY` rotation/runbook and key versioning strategy.
3. Medium: Session metadata (`IP`, `UA`) can create privacy/compliance obligations.
    1. Mitigation: define retention window and document in privacy policy.
4. Medium: Multiple token tables can increase cleanup complexity.
    1. Mitigation: add scheduled cleanup job for expired/used verification and reset tokens.
5. Medium: Login flow complexity increases with MFA challenge branch.
    1. Mitigation: strict shared contract types and dedicated end-to-end tests for challenge path.
6. High: Missing CSRF implementation would leave cookie-auth mutation endpoints exposed.
    1. Mitigation: mandatory CSRF middleware + frontend header integration before rollout.
7. Medium: URL token leakage risk on verification/reset links.
    1. Mitigation: immediate token exchange + URL scrub + no-token logging policy.
8. Medium: User lockout risk if MFA recovery policy is undefined.
    1. Mitigation: formal break-glass recovery flow with cooldown and audit trail.
9. Medium: Accidental self-lockout risk in session revoke UX.
    1. Mitigation: confirmation modal + current-session warning copy.

### Architect Recommendations (Patched Into Plan)

1. Keep deploy order backend-first and enforce feature-flag ramp-up.
2. Add explicit encryption and key-management requirement for MFA secrets.
3. Add token cleanup job as part of implementation, not as follow-up.
4. Add abuse monitoring metrics before enabling MFA and verified-email enforcement.
