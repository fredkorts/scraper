# Notification Channels CRUD API Implementation Plan

## 1. Scope

This plan covers the Phase 2 roadmap task:

- Build the `notification_channels` CRUD API

Endpoints from requirements:

- `GET /api/notifications/channels`
- `POST /api/notifications/channels`
- `PATCH /api/notifications/channels/:id`
- `DELETE /api/notifications/channels/:id`

## 2. Alignment With Current Backend

Current backend behavior already depends on notification channels:

- Registration creates a default active email channel.
- Diff persistence creates `notification_deliveries` only for active default email channels.
- Immediate/digest senders skip unsupported channel types.

Because of this, channel CRUD must preserve data integrity around `is_default` + `is_active` and must not break delivery selection semantics.

## 3. Goals

- Let authenticated users manage their notification destinations.
- Keep channel ownership strict (users can only mutate their own channels).
- Keep default-channel semantics deterministic.
- Avoid data loss in historical `notification_deliveries`.
- Keep implementation aligned with current email-first delivery flow.

## 4. Non-Goals

- Full multi-channel delivery support (Discord, WhatsApp, Signal, SMS senders).
- Admin cross-user channel management APIs.
- Notification preference matrices per change type.

## 5. Major Decisions

### 5.1 Phase scope: Email channel management only

For this phase, API accepts `channelType = EMAIL` only.

Reason:

- actual send pipeline currently supports email only
- avoids creating channels users cannot actually receive notifications through
- keeps API behavior honest with current product capabilities

Behavior:

- non-email channel types return `400 unsupported_channel_type`

### 5.2 Delete is soft-delete, not hard-delete

`DELETE /api/notifications/channels/:id` will mark channel inactive and non-default.

Reason:

- hard delete can cascade historical delivery rows
- soft-delete preserves audit/history and is safer operationally

### 5.3 Default channel invariants

Enforce in service logic:

- at most one default active channel per user + channel type
- if a channel is set default, unset previous defaults in one transaction
- if deleting/disable default and another active email channel exists, auto-promote one to default
- if no active email channels remain, user has no default email channel and will receive no new email deliveries

## 6. API Contract

## 6.1 `GET /api/notifications/channels`

Auth required: yes (`requireAuth`)

Response `200`:

- list current user channels (active and inactive)
- sorted by `createdAt desc`

## 6.2 `POST /api/notifications/channels`

Auth required: yes

Request body:

- `channelType` (`email` only for now)
- `destination` (valid email)
- optional `isDefault` (boolean)
- optional `isActive` (boolean, default true)

Rules:

- normalize destination email to lowercase and trim
- enforce uniqueness (`userId + channelType + destination`)
- if this is user’s first active email channel, force `isDefault = true`
- if `isDefault = true`, unset previous default in same transaction

Errors:

- `400 validation_error`
- `400 unsupported_channel_type`
- `409 conflict` for duplicate destination

## 6.3 `PATCH /api/notifications/channels/:id`

Auth required: yes

Allowed updates:

- `destination`
- `isDefault`
- `isActive`

Rules:

- channel must belong to authenticated user
- destination update keeps uniqueness invariant
- setting `isDefault = true` unsets other defaults in same transaction
- disabling/de-defaulting a default channel triggers fallback default promotion when possible

Errors:

- `404 not_found` if channel missing or not owned
- `400 validation_error`
- `409 conflict` on duplicate destination

## 6.4 `DELETE /api/notifications/channels/:id`

Auth required: yes

Behavior:

- soft-delete: set `isActive = false`, `isDefault = false`
- if deleted channel was default and another active email channel exists, promote replacement default

Response:

- `200` with `{ success: true }` or `204` (pick one and keep consistent)

## 7. Data Rules and Transactions

Use Prisma transactions for all mutating flows:

- create channel + adjust existing defaults
- update channel + adjust existing defaults
- soft-delete + fallback default promotion

No schema migration is required for this phase.

Existing unique constraint is already present:

- `@@unique([userId, channelType, destination])`

## 8. Backend File Plan

Add:

- `backend/src/schemas/notification-channel.ts`
- `backend/src/services/notification-channel.service.ts`
- `backend/src/controllers/notification-channel.controller.ts`
- `backend/src/routes/notifications.ts`

Update:

- `backend/src/app.ts` to mount `/api/notifications`
- `shared/src/index.ts` with request/response types for channel CRUD

## 9. Security and Access Control

- all endpoints require authenticated user
- all queries are scoped by `userId = req.auth.userId`
- do not expose channels for other users
- validate and normalize inputs before persistence

## 10. Edge Cases

- create duplicate destination for same user/type -> `409`
- patch destination to existing destination -> `409`
- delete non-owned channel -> `404`
- only one channel exists and is deleted -> user has no default email channel; future diff runs create no deliveries for that user
- inactive channel set as default -> reject or auto-activate (choose explicit behavior and test it; recommended: auto-activate when set default)

## 11. Test Plan

### 11.1 Unit/service tests

- create first email channel auto-default behavior
- create with `isDefault=true` unsets previous default
- duplicate destination conflict
- patch ownership enforcement
- patch default switch behavior
- delete default channel promotes fallback channel
- delete last channel results in no default

### 11.2 Route/integration tests

- all endpoints reject unauthenticated requests
- `GET` returns only current user channels
- `POST` accepts valid email and returns created channel
- `POST` rejects non-email channel type
- `PATCH` updates destination and default flags correctly
- `DELETE` performs soft-delete and returns success

### 11.3 Behavior regression tests tied to notifications

- after default-channel switch, new diff deliveries use the new default channel id
- inactive/non-default channels are not selected by diff recipient loading

## 12. Implementation Order

1. Add shared types for notification channel CRUD payloads/responses.
2. Add Zod schemas for create/update payloads.
3. Implement service layer with transactional invariants.
4. Implement controller and route wiring with `requireAuth`.
5. Mount notification routes in app.
6. Add service + route tests.
7. Run full backend build/test suite.
8. Mark roadmap checkbox in `REQUIREMENTS.md` when completed.

## 13. Done Criteria

- all four notification channel endpoints are implemented and authenticated
- ownership and uniqueness rules are enforced
- default-channel behavior is deterministic and tested
- delete is soft-delete and does not lose history
- diff recipient selection still works with updated channel state
- tests pass and roadmap item can be marked complete
