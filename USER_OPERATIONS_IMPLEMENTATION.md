# Implementation Plan - User Operations

This plan covers the next backend milestones from the Development Roadmap:

- Implement user registration and login
- Implement refresh-token rotation and logout revocation
- Build `/api/auth/refresh` and `/api/auth/logout`

It is scoped to authentication and session lifecycle only. It does not cover frontend auth pages, role upgrades from PayPal, or authorization middleware for protected non-auth routes.

## Goals

- Register users with validated email, password, and display name
- Log users in with email/password
- Issue short-lived access tokens in `HttpOnly` cookies
- Persist hashed refresh tokens in PostgreSQL
- Rotate refresh tokens on `/api/auth/refresh`
- Revoke the current refresh session on `/api/auth/logout`
- Return the authenticated user from `/api/auth/me`

## Design Decisions

### Auth model

Use:
- short-lived JWT access token
- opaque refresh token persisted as a hash in `refresh_tokens`

Reason:
- access tokens stay stateless and cheap to verify
- refresh sessions remain revocable server-side
- this matches the finalized PRD and schema

### Session storage

Each login creates one `RefreshToken` row:
- `tokenHash`
- `userId`
- `expiresAt`
- `revokedAt = null`
- `revocationReason = null`
- `replacedByTokenId = null`

Each refresh:
- validates the presented refresh token
- revokes the old row by setting `revokedAt`
- sets `revocationReason = "rotated"`
- creates a new refresh token row
- links the old row to the new row via `replacedByTokenId`
- issues a new access token and refresh token

This is token rotation, not token reuse.

If a revoked refresh token is presented again:
- treat it as refresh-token reuse
- assume session compromise is possible
- revoke all active refresh sessions for that user

Reason:
- reuse of a rotated refresh token is a strong signal that the token may have been stolen

### Cookie strategy

Use cookies for both tokens:
- `access_token`
- `refresh_token`

Cookie attributes:
- `httpOnly: true`
- `sameSite: "strict"`
- `secure: true` in production
- `path: "/"`

Access token lifetime:
- `15m`

Refresh token lifetime:
- `30d`

Reason:
- consistent browser-based auth flow
- minimizes XSS exposure
- supports silent session refresh

Cookie names:
- `access_token`
- `refresh_token`

## Endpoints

### `POST /api/auth/register`

Purpose:
- create a new user account

Input:
- `email`
- `password`
- `name`

Behavior:
- validate request with Zod
- normalize email to lowercase + trimmed
- reject duplicate email
- hash password with `bcrypt` using 12 rounds
- create `User` with default role `FREE`
- create a default `NotificationChannel` of type `EMAIL` using the user's email
- issue access + refresh cookies immediately after successful registration
- persist refresh token hash in `refresh_tokens`
- run user creation, default notification channel creation, and refresh token creation in a single DB transaction

Response:
- `201 Created`
- authenticated user payload

### `POST /api/auth/login`

Purpose:
- authenticate an existing user

Input:
- `email`
- `password`

Behavior:
- validate request with Zod
- lookup user by normalized email
- reject inactive or missing users
- compare password via `bcrypt.compare`
- issue fresh access + refresh tokens
- store refresh token hash in DB
- keep login failure responses generic so email enumeration is not exposed

Response:
- `200 OK`
- authenticated user payload

### `POST /api/auth/refresh`

Purpose:
- rotate refresh token and issue new session tokens

Input:
- no JSON body required
- refresh token read from cookie

Behavior:
- require refresh token cookie
- hash the presented token
- lookup matching `RefreshToken`
- reject if missing, expired, or revoked
- if a revoked token is presented, revoke all active refresh tokens for that user
- revoke current token row
- create replacement refresh token row
- issue new access + refresh cookies
- run revoke + replacement token creation in a single DB transaction

Response:
- `200 OK`
- authenticated user payload or minimal success payload

### `POST /api/auth/logout`

Purpose:
- revoke current refresh session

Input:
- no JSON body required
- refresh token read from cookie

Behavior:
- if refresh cookie exists, hash it and revoke matching DB row
- clear both auth cookies
- return success even if token was already missing or invalid

Response:
- `200 OK`

### `GET /api/auth/me`

Purpose:
- return the currently authenticated user

Input:
- access token from cookie

Behavior:
- verify access token
- load user from DB
- reject revoked/inactive/missing users

Response:
- `200 OK`
- sanitized user payload

## Required Backend Changes

### New files

#### [backend/src/routes/auth.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/routes/auth.ts)
- define auth router
- register `/register`, `/login`, `/refresh`, `/logout`, `/me`

#### [backend/src/controllers/auth.controller.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/controllers/auth.controller.ts)
- request handlers for all auth endpoints

#### [backend/src/services/auth.service.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/services/auth.service.ts)
- user creation
- password verification
- token issuance
- refresh rotation
- logout revocation

#### [backend/src/lib/jwt.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/lib/jwt.ts)
- sign access tokens
- sign refresh tokens
- verify access tokens

#### [backend/src/lib/cookies.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/lib/cookies.ts)
- central cookie options
- helper to set and clear auth cookies

#### [backend/src/lib/hash.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/lib/hash.ts)
- refresh-token hashing helper
- keep refresh token hashing separate from password hashing

#### [backend/src/middleware/auth.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/middleware/auth.ts)
- verify access token from cookie
- attach authenticated user info to request

#### [backend/src/schemas/auth.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/schemas/auth.ts)
- Zod schemas for register/login payloads
- password policy definitions

#### [backend/src/types/express.d.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/types/express.d.ts)
- extend `Express.Request` with authenticated user context

### Existing files to modify

#### [backend/src/index.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/index.ts)
- mount auth router under `/api/auth`
- add centralized error handling

#### [backend/src/config.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/config.ts)
- add auth config:
  - `ACCESS_TOKEN_TTL`
  - `REFRESH_TOKEN_TTL_DAYS`
  - optional `BCRYPT_ROUNDS`

#### [shared/src/index.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/shared/src/index.ts)
- add auth request/response types if shared typing is desired now

## Data Model Usage

### `users`

Used for:
- registration
- login identity lookup
- `me` response
- role propagation into JWT claims if needed

### `refresh_tokens`

Used for:
- session creation at register/login
- token rotation on refresh
- session revocation on logout

Recommended minimum schema support:
- `revocationReason`
- `replacedByTokenId`

These fields are enough to support basic rotation lineage and security-driven revocation reasons.

### `notification_channels`

Used for:
- default email destination on registration
- future user-managed notification destinations

Recommended minimum schema support:
- unique composite on `userId`, `channelType`, `destination`

Reason:
- prevents duplicate default email-channel rows for the same user

## Validation Rules

### Register

- `email`: valid email, normalized to lowercase
- `name`: 2-60 chars after trim
- `password`: minimum 10 chars, maximum 128 chars

Recommended stronger policy:
- at least one uppercase letter
- at least one lowercase letter
- at least one number

### Login

- `email`: valid email
- `password`: non-empty string

## Token and Cookie Details

### Access token payload

Minimal payload:
- `sub` = user id
- `role`
- `email`
- `type = "access"`
- `iss`
- `aud`

Avoid placing mutable profile fields beyond what is needed for authorization.

Verification must check:
- signature
- expiration
- issuer
- audience
- token type claim

### Refresh token format

Use a high-entropy random token, not a JWT.

Store:
- raw token in cookie only
- SHA-256 hash in DB only

Reason:
- if DB leaks, refresh tokens are not directly usable

## Error Handling

Expected auth failures:
- invalid input -> `400`
- duplicate email -> `409`
- bad credentials -> `401`
- missing/expired/invalid refresh token -> `401`
- inactive user -> `403`

Response shape should be consistent:
- `error`
- `message`

Do not reveal whether email or password was incorrect on login.

## Security Notes

- use `bcrypt` with 12 rounds by default
- wrap registration and refresh rotation in DB transactions
- clear cookies on logout even if DB revocation fails lookup
- reject revoked and expired refresh tokens
- rotate refresh tokens on every `/refresh`
- revoke all active refresh sessions if refresh-token reuse is detected
- do not log raw tokens
- keep auth routes under the stricter rate limiter already configured
- return only sanitized user payloads from auth endpoints

### CSRF note

Current design relies on:
- `HttpOnly` cookies
- `SameSite=Strict`
- restricted CORS

This is acceptable for the current same-site local deployment model.

If frontend and backend move to a cross-site deployment later, add explicit CSRF protection for state-changing routes:
- CSRF token pattern, or
- double-submit cookie pattern

### Account trust note

This phase does not include email verification.

Implication:
- newly registered accounts are considered immediately trusted for login

That is acceptable for the current project phase, but should be revisited before production launch.

## Testing Plan

### Unit tests

Add backend tests for:
- password hashing/verification helpers
- refresh token hashing helper
- access token verification
- auth service register/login/refresh/logout flows
- refresh-token reuse detection

### Integration tests

Add endpoint-level tests for:
- register success
- duplicate email rejection
- login success
- invalid login rejection
- refresh success with token rotation
- refresh rejection for revoked token
- logout clears cookies and revokes session
- `me` returns user with valid access token

### Edge cases

Test:
- logout with missing refresh cookie
- refresh with expired token
- login for inactive user
- reusing a refresh token after rotation
- duplicate registration email
- cookie clearing with matching auth cookie options

## Verification Plan

### Automated

- `npm run build`
- `npx prisma validate --schema backend/prisma/schema.prisma`
- auth route tests

### Manual

1. Register a user
2. Confirm `users` row exists
3. Confirm `refresh_tokens` row exists
4. Call `/api/auth/me` with issued cookies
5. Call `/api/auth/refresh`
6. Confirm old refresh row is revoked and new row exists
7. Call `/api/auth/logout`
8. Confirm cookies are cleared and current refresh row is revoked

## Out of Scope

- password reset
- email verification
- OAuth/social login
- device/session management UI
- admin-only authorization middleware
- PayPal-driven role upgrades

## Implementation Order

1. Add Zod schemas, JWT helpers, cookie helpers, and refresh-token hash helper
2. Implement auth service for register/login/refresh/logout
3. Implement auth middleware for access-token verification
4. Add auth controller and router
5. Mount routes in [backend/src/index.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/index.ts)
6. Add tests
7. Manually verify cookie and DB session behavior
