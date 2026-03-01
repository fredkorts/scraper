# Implementation Plan - User Auth Testing

This plan defines how to test the backend user-auth section end to end:

- registration
- login
- access-token auth
- refresh-token rotation
- logout revocation
- `/api/auth/me`

It covers:
- user flows
- edge cases
- security-sensitive scenarios
- test layers
- recommended fixtures and helpers

It does not cover:
- frontend login/register UI tests
- PayPal-driven role changes
- password reset
- email verification

## Goals

- confirm that normal auth flows work correctly
- confirm cookies are set and cleared correctly
- confirm DB session state matches API behavior
- confirm invalid input and invalid credentials are handled safely
- confirm refresh-token rotation and reuse detection behave as designed
- confirm auth responses never expose sensitive fields

## Testing Strategy

Use three layers:

1. Unit tests
- pure helpers and token utilities
- schema validation
- cookie utilities

2. Service tests
- `auth.service.ts` against a test database
- verify DB state transitions directly

3. Endpoint/integration tests
- exercise HTTP routes
- assert status codes, response bodies, and `Set-Cookie` behavior

Recommended priority:
- service tests first
- route/integration tests second
- helper unit tests for targeted coverage

## Test Environment

### Database

Use a dedicated Postgres test database, not the local development DB.

Recommended options:
- separate Docker database for tests
- or same Postgres instance with a dedicated test database and schema reset between runs

### Environment values

Test env should use:
- short access-token TTL if needed for expiry tests
- short refresh-token TTL only in targeted expiry tests
- test-specific `JWT_SECRET`
- test-specific `JWT_ISSUER`
- test-specific `JWT_AUDIENCE`

### Isolation

Each test suite should:
- start from a clean DB state
- truncate or recreate relevant tables
- avoid depending on existing users or refresh tokens

Minimum tables to reset:
- `refresh_tokens`
- `notification_channels`
- `user_subscriptions`
- `users`

## Core User Flows

### Flow 1: Register new user

Expected behavior:
- valid payload is accepted
- user row is created
- password is stored hashed
- default email notification channel is created
- refresh-token row is created
- access and refresh cookies are set
- response returns sanitized user object only

### Flow 2: Login existing user

Expected behavior:
- valid credentials return `200`
- access and refresh cookies are set
- new refresh-token row is created
- user payload is sanitized

### Flow 3: Get current user with valid access token

Expected behavior:
- valid access cookie returns `200`
- response matches authenticated user

### Flow 4: Refresh session

Expected behavior:
- valid refresh cookie returns `200`
- old refresh token is revoked
- `revocationReason = "rotated"`
- old token gets `replacedByTokenId`
- new refresh token row is created
- new access and refresh cookies are set

### Flow 5: Logout current session

Expected behavior:
- current refresh token is revoked
- `revocationReason = "logout"`
- both auth cookies are cleared
- route returns success even if cookie is already missing

### Flow 6: Refresh-token reuse detection

Expected behavior:
- attempting to reuse a rotated refresh token returns `401`
- all active refresh tokens for that user are revoked
- active sessions receive `revocationReason = "reuse_detected"`

## Endpoint Test Matrix

### `POST /api/auth/register`

Success cases:
- registers user with valid payload
- normalizes email to lowercase
- trims name and email as expected

Failure cases:
- duplicate email
- invalid email
- password too short
- password missing uppercase/lowercase/number
- password too long
- name too short
- name too long
- missing required fields
- malformed JSON body

Assertions:
- status code
- sanitized response body
- `Set-Cookie` for both cookies
- `users` row count
- `notification_channels` row count
- `refresh_tokens` row count
- password hash is not equal to raw password

### `POST /api/auth/login`

Success cases:
- logs in valid user

Failure cases:
- non-existent email
- wrong password
- inactive user
- missing email
- missing password

Assertions:
- generic error message for invalid credentials
- cookies set only on success
- refresh-token row created only on success

### `POST /api/auth/refresh`

Success cases:
- valid refresh cookie rotates session

Failure cases:
- missing refresh cookie
- invalid refresh cookie
- expired refresh token
- revoked refresh token
- rotated token reused
- inactive user

Assertions:
- old token revoked on success
- `revocationReason = "rotated"` for rotated token
- `replacedByTokenId` is populated
- new refresh-token row exists
- cookies replaced on success
- `reuse_detected` revocation applied during token reuse detection

### `POST /api/auth/logout`

Success cases:
- logout with valid refresh token
- logout with missing refresh cookie
- logout with already revoked token

Assertions:
- always returns `200`
- cookies cleared
- valid current session gets `revocationReason = "logout"`

### `GET /api/auth/me`

Success cases:
- valid access token returns current user

Failure cases:
- missing access cookie
- invalid access token
- expired access token
- wrong token type
- user deleted after token issuance
- inactive user

Assertions:
- sanitized user shape
- no password hash or session data in response

## Service-Level Tests

### `register()`

Test:
- creates user, default notification channel, and refresh token in one transaction
- fails cleanly on duplicate email
- does not leave partial rows behind if notification channel creation fails

### `login()`

Test:
- returns new session tokens for valid credentials
- rejects invalid credentials
- rejects inactive user

### `refreshSession()`

Test:
- rotates valid token
- revokes expired token with `revocationReason = "expired"`
- revokes all active sessions when a revoked token is reused
- sets `replacedByTokenId` during normal rotation

### `logout()`

Test:
- revokes current token with `revocationReason = "logout"`
- succeeds when token is missing

### `getCurrentUser()`

Test:
- returns sanitized user
- rejects missing user
- rejects inactive user

## Helper and Middleware Tests

### Zod schema tests

Test:
- `registerSchema` accepts valid payloads
- rejects weak passwords
- normalizes email
- trims name

### JWT helper tests

Test:
- signs access token with expected claims
- verifies valid access token
- rejects token with wrong issuer
- rejects token with wrong audience
- rejects token with wrong type

### Cookie helper tests

Test:
- sets both cookies with expected names
- uses `httpOnly`
- uses `sameSite=strict`
- uses correct `maxAge`
- clears cookies with matching options

### Auth middleware tests

Test:
- attaches `req.auth` for valid access token
- rejects missing token
- rejects invalid token
- rejects expired token

## Security-Focused Edge Cases

### Duplicate registration race

Scenario:
- two registration attempts for the same email happen close together

Expected:
- one succeeds
- one fails with conflict
- only one user exists
- only one default email notification channel exists

### Refresh reuse after rotation

Scenario:
- client refreshes successfully
- attacker or stale client reuses old refresh token

Expected:
- request fails with `401`
- all active refresh tokens for that user are revoked

### Inactive account behavior

Scenario:
- user becomes inactive after login

Expected:
- login rejected
- refresh rejected
- `/me` rejected

### Sensitive field leakage

Scenario:
- success and error responses are inspected

Expected:
- never return:
  - `passwordHash`
  - raw refresh token
  - `tokenHash`
  - refresh-token metadata

### Cookie correctness

Scenario:
- login, refresh, and logout responses are inspected

Expected:
- cookies use correct names
- cookies are `HttpOnly`
- cookies use strict same-site behavior
- logout clears the same cookie names and paths

## Recommended Test Fixtures

### Factory helpers

Add helpers for:
- creating users
- creating inactive users
- creating refresh-token rows
- creating rotated/revoked/expired refresh tokens

### Cookie helpers

Add helpers for:
- parsing `Set-Cookie`
- extracting `access_token`
- extracting `refresh_token`

### DB helpers

Add helpers for:
- truncating auth tables
- counting user/session/channel rows
- fetching latest refresh token for a user

## Manual Verification Plan

### Register flow

1. `POST /api/auth/register` with valid payload
2. confirm `201`
3. inspect cookies
4. confirm one `users` row
5. confirm one default `notification_channels` row
6. confirm one `refresh_tokens` row

### Login flow

1. `POST /api/auth/login`
2. confirm `200`
3. confirm new refresh-token row created

### Me flow

1. call `GET /api/auth/me` with access cookie
2. confirm authenticated user payload

### Refresh flow

1. call `POST /api/auth/refresh`
2. confirm new cookies returned
3. confirm old refresh token revoked
4. confirm `replacedByTokenId` set

### Logout flow

1. call `POST /api/auth/logout`
2. confirm cookies cleared
3. confirm current refresh token revoked with `logout`

### Reuse detection flow

1. save old refresh token before normal refresh
2. refresh once successfully
3. reuse old refresh token
4. confirm `401`
5. confirm all active refresh tokens for user are revoked with `reuse_detected`

## Suggested File Layout For Tests

Recommended backend test files:

- `backend/src/lib/jwt.test.ts`
- `backend/src/lib/cookies.test.ts`
- `backend/src/schemas/auth.test.ts`
- `backend/src/middleware/auth.test.ts`
- `backend/src/services/auth.service.test.ts`
- `backend/src/routes/auth.test.ts`

If route tests are added, also add:

- test app factory
- test DB setup/teardown helpers

## Exit Criteria

The auth section is considered adequately tested when:

- all core flows pass
- duplicate/invalid credential cases pass
- refresh rotation is verified in DB
- refresh-token reuse detection is verified in DB
- logout revocation is verified in DB
- sanitized response shapes are verified
- cookie behavior is verified
- no partial rows remain after failed transactional flows
