# Telegram Notification Channel Implementation Plan

## Status

Planned (`March 15, 2026`).

## Target

[documentation/backend/TELEGRAM_NOTIFICATION_CHANNEL_IMPLEMENTATION.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/documentation/backend/TELEGRAM_NOTIFICATION_CHANNEL_IMPLEMENTATION.md)

## Summary

Add Telegram as a first-class notification channel using a bot-link flow, while preserving existing email behavior and enforcing role-based entitlements.

## Functional Model (How It Works)

1. PricePulse owns a Telegram bot.
2. User clicks `Connect Telegram` in Settings.
3. Backend creates a short-lived one-time link token and returns `https://t.me/<bot>?start=<token>`.
4. UI shows both same-device and cross-device options: `Open Telegram`, copyable deep link, and QR code.
5. User opens Telegram and sends `/start <token>` to the bot.
6. Telegram webhook calls backend.
7. Backend validates token, binds Telegram `chat_id` to that app user as a pending link, and waits for explicit in-app confirmation.
8. UI polls `link-status` and transitions from `Awaiting Telegram` to `Awaiting confirmation` when pending link is consumed.
9. User confirms in app, channel becomes active, and system sends a one-time `Telegram connected successfully` confirmation message to that chat.
10. Notification pipeline can deliver to Telegram for eligible users.

## Architecture Decisions (Locked)

1. One Telegram bot per deployment environment (`dev`, `staging`, `prod`), shared by users within that environment.
2. Telegram linking is one-time-token based (not manual chat ID entry).
3. Bot webhook is required and must be authenticated by Telegram secret token.
4. Channel entitlement:

- free: email only
- paid/admin: email + telegram

5. Telegram stays behind `NOTIFICATIONS_TELEGRAM_ENABLED`.
6. Existing email channel behavior remains unchanged by default.
7. Telegram destination value is Telegram `chat_id` (stored as string in `notification_channels.destination`) in v1.
8. v1 scope is direct user chat; no Telegram groups/channels.
9. Default-channel invariant is global: exactly one active default channel per user across all channel types.
10. Delivery channel policy is single-channel/no automatic fallback in v1 (failed telegram does not auto-send email).
11. Link flow is two-step: webhook binding + explicit in-app confirmation before activating Telegram channel.
12. UX policy: always expose both same-device and cross-device linking affordances (deep link + QR + copy link).
13. UX policy: setting Telegram as default must show explicit no-fallback warning copy.
14. On successful confirm, system sends one non-marketing verification message to Telegram so the user can validate channel setup immediately.

## Goals

1. Eligible users can link Telegram safely.
2. Telegram can be selected as default channel.
3. Immediate and digest notification senders can route to Telegram.
4. Existing email flows keep working without regressions.

## Non-Goals (v1)

1. Telegram group/channel broadcast support.
2. Rich interactive bot commands beyond `/start` linking flow.
3. Per-user dedicated Telegram bots.
4. New notification providers beyond Telegram.

## Current-State Audit

1. Notification channel schema/service currently supports email-only runtime behavior.
2. Immediate and digest senders currently skip non-email channels.
3. Delivery recipient selection currently creates deliveries only for default email channels.
4. Frontend notifications settings currently expose only email channel creation UX.

## Scope

1. Include:

- Prisma enum + migration for Telegram channel type.
- Telegram link challenge persistence.
- Telegram webhook route + handler.
- Notification channel service entitlement updates.
- Delivery recipient loading updates.
- Sender routing updates (email + telegram).
- Frontend connect/disconnect UX.
- TDD coverage mapped to user stories and edge cases.

2. Exclude:

- Telegram transport batching optimization.
- Telegram group notifications.
- Per-product/per-category channel routing overrides.

## Backend Design

## Data Model Changes

1. `NotificationChannelType` enum:

- add `TELEGRAM`.

2. Add `telegram_link_challenges` table:

- `id` (uuid)
- `user_id` (uuid, indexed)
- `token_hash` (unique)
- `expires_at`
- `used_at` nullable
- `created_at`
- `created_by_ip` nullable
- `created_by_user_agent` nullable
- `telegram_chat_id` nullable (captured at webhook consume, before in-app confirmation)
- `telegram_user_id` nullable
- `confirmed_at` nullable

3. Optional telemetry fields (recommended):

- `linked_telegram_user_id` on challenge consume logs (not persisted in channel table if not needed).

4. Channel cardinality rule:

- enforce max one active Telegram channel per user in service logic, tests, and DB (partial unique index in migration).

## API Endpoints

1. `POST /api/notifications/channels/telegram/link`

- auth required
- paid/admin only
- returns `deepLinkUrl`, `expiresAt`
- invalidates previous unconsumed challenge for same user

2. `POST /api/notifications/telegram/webhook`

- public route
- requires Telegram secret token header validation
- consumes `/start <token>` updates only for v1 linking flow
- accepts private chats only
- records idempotency by Telegram `update_id`

3. `POST /api/notifications/channels/telegram/confirm`

- auth required
- paid/admin only
- finalizes a specific consumed challenge (`challengeId`) and activates/sets Telegram channel
- triggers one-time Telegram verification message after successful activation
- returns deterministic error for expired/used/unbound challenges

4. `GET /api/notifications/channels/telegram/link-status`

- auth required
- paid/admin only
- returns latest pending/consumed-unconfirmed challenge metadata (including `challengeId`, masked Telegram identity preview, expiry state, and UI-safe status enum) for confirmation UI polling.

5. Existing channel endpoints:

- list/update/delete must support telegram channels consistently.

## Security Requirements

1. Link tokens must be random, single-use, and short-lived (for example 10 minutes).
2. Store token hash only; never store raw token.
3. Reject expired/used tokens deterministically.
4. Webhook requests must validate configured secret.
5. Apply rate limiting for link-token creation and webhook processing.
6. Never log raw token, bot token, or full webhook payloads containing sensitive content.
7. Only one active link challenge per user at any time.
8. Enforce webhook idempotency by storing processed Telegram `update_id` with bounded TTL (recommended >=24h).
9. Accept only `private` chat type in v1; reject group/channel updates.
10. Require explicit in-app confirmation after webhook consume to mitigate token-forwarding misbinding.
11. Telegram message rendering must be safe by default (send plain text or escape markdown/html control characters).
12. Verification message on successful linking must be idempotent per confirmed challenge (`at most once` send attempt per challenge id).

## Notification Pipeline Changes

1. Recipient selection:

- when creating deliveries, include active default channel regardless of type (email or telegram), constrained by entitlement and feature flags.
- enforce single default active channel invariant before recipient selection.

2. Immediate sender:

- keep paid/admin behavior.
- route by `channelType`:
- `EMAIL` -> existing email transport
- `TELEGRAM` -> telegram transport

3. Digest sender:

- keep free-user digest policy; if free users are not entitled to Telegram, Telegram channels are skipped/blocked before this stage.

4. Delivery fallback policy:

- no automatic cross-channel fallback in v1
- telegram send failures mark that delivery failed/skipped with explicit reason code and metrics

## Frontend Design

1. Notifications tab:

- add `Connect Telegram` action for paid/admin.
- show connection state (`Not connected`, `Awaiting Telegram`, `Awaiting confirmation`, `Connected`, `Disabled by plan`, `Temporarily unavailable`).

2. Free users:

- show clear entitlement messaging (Telegram requires paid/admin).

3. Error UX:

- show safe actionable messages for expired link token and disabled feature flag.

4. Confirmation UX:

- poll/read `link-status` after deep-link step, show Telegram account preview (safe metadata), and require user click `Confirm Telegram link`.

5. Linking modal UX:

- include `Open Telegram`, `Copy link`, and `Show QR` actions.
- include `I've sent /start` control that triggers immediate status refresh.
- if status expires, show `Link expired` with single-click `Generate new link`.

6. Default channel selection UX:

- when user selects Telegram as default, show blocking confirmation text: `Telegram delivery has no automatic fallback to email in v1.`
- require explicit confirmation before saving default channel change.

7. Relink UX:

- if user already has connected Telegram, CTA becomes `Relink Telegram`.
- show current masked Telegram identity and state that confirming new link replaces previous Telegram destination.

8. Disconnect UX:

- if Telegram is default and email channel exists, show `Switch default to email and disconnect Telegram`.
- if Telegram is default and no active email exists, block disconnect with clear remediation (`Add or reactivate email channel first`).

9. Accessibility and localization UX:

- all states and errors must be screen-reader announced (`aria-live=polite` for async status updates).
- controls must be keyboard reachable in logical order.
- all user-facing strings must be localization-ready (no hardcoded provider errors shown raw).

10. Post-confirm success UX:

- show `Telegram connected` success state in-app with text that a confirmation message was sent to Telegram.
- if confirmation message send fails, keep channel connected but show non-blocking warning with retry option.

## User Stories

1. `US-01` Paid user links Telegram.

- As a paid user, I can connect Telegram so I can receive alerts there.

2. `US-02` Admin user links Telegram.

- As an admin user, I can connect Telegram and set it as default channel.

3. `US-03` Free user restriction.

- As a free user, I cannot create or use Telegram channel.

4. `US-04` Immediate delivery via Telegram.

- As a paid/admin user with Telegram default channel, immediate alerts are delivered to Telegram.

5. `US-05` Existing email stability.

- As any user, existing email channel behavior keeps working unchanged.

6. `US-06` Safe relinking.

- As a user, relinking Telegram updates my existing Telegram channel rather than creating broken duplicates.

7. `US-07` Downgrade reconciliation.

- As a downgraded user (paid/admin -> free), my Telegram channel is automatically disabled and default falls back safely.

8. `US-08` Safe final confirmation.

- As a user, my Telegram channel is activated only after I confirm in app, preventing accidental/malicious misbinding.

9. `US-09` Cross-device completion.

- As a desktop user with Telegram on phone, I can complete linking via QR or copied link without losing context.

10. `US-10` Explicit default risk acknowledgment.

- As a user setting Telegram as default, I am clearly informed that Telegram has no automatic fallback in v1.

11. `US-11` Safe relink/disconnect.

- As a user, I can relink or disconnect Telegram with clear outcomes and no hidden delivery loss.

12. `US-12` Immediate setup verification.

- As a user, after connecting Telegram I receive a confirmation message so I know the channel works.

## Edge Cases

1. `EC-01` Expired link token.
2. `EC-02` Reused (already consumed) token.
3. `EC-03` Malformed `/start` payload.
4. `EC-04` Webhook secret mismatch.
5. `EC-05` Telegram API send failure (network or 4xx/5xx).
6. `EC-06` User deactivated after linking.
7. `EC-07` Telegram feature flag disabled while channel exists.
8. `EC-08` Role downgrade disables Telegram entitlement.
9. `EC-09` Duplicate webhook deliveries from Telegram.
10. `EC-10` User links Telegram from one account then attempts token from another account.
11. `EC-11` Missing default channel after Telegram disable action.
12. `EC-12` Concurrent link attempts for same user.
13. `EC-13` Telegram webhook update from group/channel chat.
14. `EC-14` Telegram bot blocked by user (`403` from Telegram API).
15. `EC-15` Missing/invalid in-app confirmation attempt.
16. `EC-16` Multiple active default channels detected due to data drift.
17. `EC-17` Desktop browser cannot open Telegram app directly.
18. `EC-18` `link-status` polling times out with no webhook event.
19. `EC-19` User attempts to disconnect Telegram while it is default and no active email fallback exists.
20. `EC-20` User relinks to a different Telegram account and must explicitly confirm replacement.
21. `EC-21` Telegram channel activates but verification message fails (provider timeout/403).

## TDD Strategy (Mandatory)

1. Rule:

- no implementation code before failing test exists for each story/edge case.

2. Test progression:

- write failing unit tests first
- then failing integration tests
- then implement minimal code to pass
- refactor with tests green

3. Coverage gate:

- every `US-*` and `EC-*` must map to at least one automated test.

## Test Matrix (Story/Edge-Case Driven)

1. `T-01` `US-01`

- Given paid user
- When requesting Telegram link
- Then API returns deep link + challenge persisted.

2. `T-02` `US-02`

- Given admin user
- When webhook receives valid `/start token`
- Then pending Telegram link is recorded and remains inactive until in-app confirmation.

3. `T-03` `US-03`

- Given free user
- When requesting link/create telegram channel
- Then API returns entitlement error.

4. `T-04` `US-04`

- Given paid/admin user with default Telegram channel
- When immediate sender processes pending delivery
- Then message sent via Telegram transport and delivery marked sent.

5. `T-05` `US-05`

- Given email-only user/channel
- When notification senders run
- Then existing email path remains unchanged.

6. `T-06` `US-06`

- Given existing Telegram channel
- When user relinks with new chat id
- Then channel updates deterministically and remains single default.

7. `T-07` `US-07` + `EC-08`

- Given paid user downgraded to free
- When entitlement reconciliation runs
- Then telegram channel disabled and default falls back to active email.

8. `T-08` `EC-01`

- expired token -> rejected with safe error.

9. `T-09` `EC-02`

- reused token -> rejected idempotently.

10. `T-10` `EC-03`

- malformed `/start` payload -> ignored safely with non-fatal handling.

11. `T-11` `EC-04`

- webhook secret mismatch -> unauthorized.

12. `T-12` `EC-05`

- Telegram send failure -> delivery failed/skipped with reason; worker continues.

13. `T-13` `EC-06`

- inactive user/channel -> delivery skipped.

14. `T-14` `EC-07`

- feature disabled + telegram channel exists -> deterministic `not_enabled` behavior.

15. `T-15` `EC-09`

- duplicate webhook event -> no duplicate channel creation.

16. `T-16` `EC-10`

- token-user mismatch attempts -> rejected.

17. `T-17` `EC-11`

- disabling telegram default channel promotes valid email default.

18. `T-18` `EC-12`

- concurrent link requests -> only one valid consume path; no corrupted state.

19. `T-19` `US-08` + `EC-15`

- webhook-consumed link stays inactive until authenticated in-app confirmation.

20. `T-20` `EC-13`

- non-private chat update is rejected/ignored safely.

21. `T-21` `EC-14`

- telegram API `403 blocked` marks delivery with explicit non-retryable reason.

22. `T-22` `EC-16`

- reconciliation enforces single active default channel deterministically.

23. `T-23` Webhook idempotency

- duplicate `update_id` is ignored without duplicate linking side effects.

24. `T-24` Confirm endpoint ownership

- `challengeId` must belong to authenticated user and be in consumed-unconfirmed state.

25. `T-25` Pending-link status contract

- `link-status` endpoint returns deterministic pending/expired/none states and safe masked identity preview.

26. `T-26` `US-09` + `EC-17`

- linking modal provides QR + copy-link flows and successful completion path without deep-link app open.

27. `T-27` `EC-18`

- polling timeout shows non-terminal guidance (`Still waiting for Telegram`) and allows manual refresh/regenerate.

28. `T-28` `US-10`

- selecting Telegram as default requires explicit user acknowledgment of no-fallback policy.

29. `T-29` `US-11` + `EC-19`

- disconnect is blocked when Telegram is default and no active email channel exists.

30. `T-30` `US-11` + `EC-20`

- relink confirmation clearly indicates replacement of existing Telegram identity; new channel only activates after confirmation.

31. `T-31` Accessibility smoke

- keyboard-only flow can complete connect/relink/disconnect and status updates are announced accessibly.

32. `T-32` Localization safety

- UI uses localized copy keys for all Telegram states/errors and does not surface raw provider errors to users.

33. `T-33` `US-12`

- successful confirm triggers one-time verification message to Telegram and records send outcome.

34. `T-34` `EC-21`

- if verification send fails, channel remains connected; UI shows non-blocking warning and optional retry path.

## Implementation Phases (TDD First)

## Phase 0: Test Harness Prep

1. Add fixtures/factories for Telegram challenges and channels.
2. Add transport mocking utilities for Telegram sender tests.

## Phase 1: Contract and Schema Tests (Failing First)

1. Add failing tests for enum/contracts and API response parsing.
2. Implement Prisma/shared/frontend schema updates.

## Phase 2: Link Flow Tests (Failing First)

1. Add failing tests for link challenge create/consume and webhook auth.
2. Add failing tests for two-step confirmation, confirm-by-id ownership checks, pending-link status endpoint, and idempotent `update_id` handling.
3. Implement link endpoints, webhook handler, confirm endpoint, and link-status endpoint.
4. Implement one-time verification message send on successful confirm with at-most-once semantics per challenge.

## Phase 3: Sender Routing Tests (Failing First)

1. Add failing tests for immediate/digest routing by channel type.
2. Implement Telegram transport adapter and sender branching.
3. Add tests for explicit no-fallback policy and Telegram `403` non-retryable handling.

## Phase 4: Entitlement and Downgrade Tests (Failing First)

1. Add failing tests for free-user blocking and downgrade reconciliation.
2. Add failing tests for single-default invariant enforcement.
3. Implement entitlement enforcement and reconciliation logic.

## Phase 5: Frontend UX Tests (Failing First)

1. Add failing tests for connect button, role messaging, and states.
2. Add failing tests for cross-device modal actions, timeout/retry, default no-fallback confirmation, relink/disconnect safeguards, and a11y/i18n behavior.
3. Add failing tests for post-confirm success/warning states and verification-message retry affordance.
4. Implement notifications settings UI updates.

## Acceptance Criteria

1. Paid/admin users can link Telegram successfully.
2. Free users cannot create/use Telegram channels.
3. Immediate/digest flows route correctly by channel type.
4. Existing email behavior has no regression.
5. All `US-*` and `EC-*` cases have passing automated tests.
6. Feature flag can disable Telegram behavior safely.
7. Two-step link confirmation is required before Telegram channel activation.
8. Single active default channel invariant holds after all channel mutations.
9. Duplicate webhook updates do not create duplicate links/channels.
10. Users can complete linking from desktop+mobile flow (QR/copy link) without dead ends.
11. Setting Telegram as default requires explicit no-fallback acknowledgment.
12. Relink/disconnect flows are clear, safe, and accessible.
13. After successful Telegram confirmation, user receives one-time verification message (or sees non-blocking warning if provider send fails).

## Risks and Mitigations

1. Risk: webhook abuse/noise.

- Mitigation: secret validation + rate limits + strict payload parsing.

2. Risk: token replay.

- Mitigation: one-time hashed token + TTL + used-at enforcement.

3. Risk: delivery instability from Telegram API outages.

- Mitigation: retry/backoff policy + failure metrics + explicit no-fallback failure handling.

4. Risk: entitlement drift after plan changes.

- Mitigation: explicit downgrade reconciliation tests and transactional updates.

5. Risk: staging/prod webhook collisions.

- Mitigation: one bot per environment and environment-specific webhook secrets/config.

6. Risk: token forwarding links wrong chat.

- Mitigation: two-step link confirmation with in-app user confirmation before channel activation.

7. Risk: webhook replay/duplicate deliveries create side effects.

- Mitigation: `update_id` idempotency store + private-chat-only filtering.

8. Risk: UX drop-off in cross-device linking.

- Mitigation: provide deep link + copy + QR, explicit step guidance, and timeout/retry recovery in modal.

9. Risk: users misunderstand Telegram no-fallback behavior and miss alerts.

- Mitigation: blocking default-selection confirmation with explicit copy and audit test coverage.

10. Risk: users think linking failed when channel is connected but no message appears.

- Mitigation: one-time verification ping after confirm + explicit in-app success/warning state with retry action.

## Telegram Provider Operations Runbook (Minimum)

1. Bot provisioning:

- create separate bots for `dev`, `staging`, `prod`.
- store bot token and webhook secret in environment-scoped secret managers.

2. Webhook management:

- set webhook per environment with secret token.
- verify webhook health at deploy time.
- rotate webhook secret with dual-deploy procedure (new secret rollout + old secret grace window if needed).

3. Failure operations:

- track Telegram send success/failure rate and `403 blocked` ratio.
- track verification-message success ratio for newly confirmed links.
- if Telegram send error rate >10% for 10 minutes, page on-call and investigate provider/API health.
- if Telegram provider outage is confirmed, disable `NOTIFICATIONS_TELEGRAM_ENABLED`; email defaults continue, and Telegram-default deliveries follow explicit no-fallback handling.
- alert when queue latency for Telegram deliveries exceeds 5 minutes for 15 minutes.

4. Rate limiting:

- enforce per-bot and per-user send pacing to avoid Telegram limits.
- queue and retry transient failures with bounded attempts.

## Privacy And Retention

1. Treat Telegram `chat_id`, `telegram_user_id`, IP, and user agent as personal data.
2. Retain consumed/expired link challenges for bounded window (for example 30 days) then purge.
3. On user account deletion, remove/deactivate Telegram channel bindings and related pending link artifacts.
4. Keep logs redacted; never log raw tokens or bot credentials.

## Verification Commands

1. `npm run test --workspace=backend`
2. `npm run test --workspace=frontend`
3. `npm run lint --workspace=backend`
4. `npm run lint --workspace=frontend`

## Rollout

1. Deploy schema + backend code with `NOTIFICATIONS_TELEGRAM_ENABLED=false`.
2. Deploy frontend connect UI hidden/disabled by feature capability response if needed.
3. Enable feature flag in staging and run story/edge-case QA.
4. Enable production gradually for paid/admin cohort.
5. Use environment-specific bot credentials/webhooks (`dev`, `staging`, `prod`) before enabling in each environment.
