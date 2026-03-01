# Email Flow Implementation Plan

## Goal

Implement the next Phase 2 notification steps after the diff engine:

1. backend tests for notification delivery state transitions
2. email templates plus delivery integration
3. immediate paid-user sends and the 6-hour free-user digest job

The plan must stay aligned with the current project goals and stack:

- backend: Node.js + Express + TypeScript
- database: PostgreSQL + Prisma
- current diff output: canonical `change_reports`, `change_items`, `notification_deliveries`
- development email transport: Nodemailer
- production email transport: Resend
- queue/scheduler later: Bull + Redis + cron

This phase should turn persisted delivery rows into actual email behavior without breaking the canonical diff model.

## Current starting point

Already implemented:

- diff engine creates canonical `change_reports`
- diff engine creates `change_items`
- diff engine creates `notification_deliveries` with initial `PENDING` status
- deliveries are scoped per user and per channel
- only default active email channels are created today

Not implemented yet:

- state-transition tests for deliveries
- HTML email rendering
- actual sending
- immediate paid-user dispatch
- digest aggregation for free users

## Design principles

### Canonical report, user-specific delivery

Keep the existing separation:

- `change_report` answers: what changed in the system
- `notification_delivery` answers: what happened for this user/channel

Do not duplicate change payloads into user-specific reports.

### Delivery status is the source of truth

Email workflow state should live in `notification_deliveries.status`.

Allowed statuses:

- `PENDING`
- `SENT`
- `FAILED`
- `SKIPPED`

These statuses should be updated only by explicit backend logic, never inferred later.

### Uniform persistence, role-specific dispatch

Both paid and free users already receive `PENDING` delivery rows from the diff engine.

That should remain true.

Then:

- paid users: dispatch immediately after diff/report creation
- free users: dispatch later via digest job using pending deliveries

This keeps the model simple and avoids separate persistence rules per role.

## Scope

Included:

- delivery state-transition tests
- email template rendering layer
- email transport abstraction
- paid-user immediate dispatch service
- free-user digest aggregation service
- CLI/job entrypoints for local/manual runs
- backend tests for success/failure/skipped flows

Out of scope:

- Bull worker wiring
- cron registration
- frontend email preview UI
- multi-channel sending beyond email

## Target backend structure

### New modules

- `backend/src/notifications/types.ts`
- `backend/src/notifications/templates.ts`
- `backend/src/notifications/transport.ts`
- `backend/src/notifications/send-immediate.ts`
- `backend/src/notifications/send-digest.ts`
- `backend/src/notifications/helpers.ts`

### Suggested responsibilities

`types.ts`

- template payload types
- transport interface
- digest grouping result types

`templates.ts`

- render HTML/text for:
  - immediate single-report email
  - free-user digest email

`transport.ts`

- environment-aware provider abstraction
- Nodemailer in development
- Resend in production

`helpers.ts`

- fetch delivery/report/user/channel payloads
- common status update helpers
- email subject builders

`send-immediate.ts`

- process pending paid-user deliveries for one `change_report`
- send one email per delivery
- mark each row `SENT`, `FAILED`, or `SKIPPED`

`send-digest.ts`

- collect pending free-user deliveries eligible for digest
- aggregate by user
- render one digest email per user
- mark included delivery rows after send
- update `users.last_digest_sent_at`

## Data flow

### Immediate paid-user flow

1. Diff engine creates `change_report` and `notification_deliveries`.
2. Immediate delivery service loads:
   - `notification_deliveries` with `status = PENDING`
   - only for users with `role = PAID` or `role = ADMIN`
   - only for email channels
3. For each delivery:
   - load the canonical `change_report` and `change_items`
   - render the immediate email template
   - send email through the configured transport
   - update delivery status:
     - `SENT` on success
     - `FAILED` on provider error
     - `SKIPPED` if required data is missing or user/channel is no longer eligible

Important rule:

- the immediate sender must not load or mutate free-user deliveries
- free-user deliveries remain `PENDING` until the digest job processes them

### Free-user digest flow

1. Digest job selects users with:
   - `role = FREE`
   - active default email channel
   - pending email deliveries
   - `last_digest_sent_at` older than 6 hours, or null
2. For each eligible user:
   - load all eligible pending deliveries since the last digest cut-off
   - group by `change_report`
   - aggregate report summaries and change items
   - render one digest email
   - send the digest email
   - if successful:
     - mark included deliveries as `SENT`
     - set `users.last_digest_sent_at = now`
   - if failed:
     - keep deliveries `PENDING` for transient transport/provider/network failures
     - mark deliveries `SKIPPED` only for deterministic data or eligibility problems

Recommended rule:

- provider/network failure: keep deliveries `PENDING`
- user/data eligibility issue: mark deliveries `SKIPPED`

## Delivery state transition rules

### `PENDING -> SENT`

When:

- email transport confirms successful send

Update:

- `notification_deliveries.status = SENT`
- `notification_deliveries.sent_at = now`
- `notification_deliveries.error_message = null`

### `PENDING -> FAILED`

When:

- immediate-send transport throws
- immediate-send provider rejects the request
- immediate-send runtime config for sending is missing

Update:

- `status = FAILED`
- `error_message = provider or runtime error summary`
- `sent_at = null`

Important note:

- in this phase, `FAILED` is primarily for immediate paid/admin send attempts
- free-user digest transport/config failures should usually remain `PENDING`

### `PENDING -> SKIPPED`

When:

- user is inactive
- channel is inactive
- channel is not email
- delivery no longer matches the job type
- referenced report/items are missing or invalid

Update:

- `status = SKIPPED`
- `error_message = short deterministic reason`

### `FAILED` retry policy

For this phase:

- do not implement automatic retry scheduling yet
- allow manual/job reruns to reprocess only selected failures if needed later

Recommended immediate rule:

- immediate sender processes only `PENDING`
- digest sender processes only `PENDING`

This avoids hidden retry loops until queue semantics are introduced.

## Template plan

### Immediate email

Purpose:

- one email for one canonical `change_report`

Content:

- category name
- scrape timestamp
- counts by change type
- compact list of changed products
- per-item details:
  - product name
  - product URL
  - image
  - old/new price if applicable
  - stock transition label if applicable

Subject example:

- `Mabrik alert: 4 changes in Lauamängud`

### Free-user digest email

Purpose:

- one email summarizing all pending eligible changes for a user in the last 6-hour window

Content:

- digest window
- grouped by category
- grouped by report/time within category
- summary counts
- changed products per report

Subject example:

- `Mabrik digest: 12 changes across 3 categories`

### Rendering format

Provide both:

- HTML body
- plain-text fallback

Why:

- better deliverability
- easier local inspection and testing

### Template implementation style

Keep it dependency-light.

Recommended approach:

- plain TypeScript string rendering helpers
- shared escaping helpers
- no heavyweight email templating library yet

Reason:

- the templates are structured but simple
- this keeps rendering easy to test

## Transport plan

### Transport abstraction

Create a small interface:

- `sendEmail({ to, subject, html, text })`

Implementations:

- SMTP via Nodemailer
- Resend

Selection rule:

- use explicit `EMAIL_PROVIDER=smtp|resend`
- do not infer the provider only from `NODE_ENV`
- this keeps local, staging, preview, and production behavior explicit

### Configuration

Add environment variables for:

- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `RESEND_API_KEY`

Use validation in backend config with optional/provider-specific handling.

Important:

- do not require both SMTP and Resend config at once
- validate only the active provider’s config selected by `EMAIL_PROVIDER`

## Immediate delivery implementation plan

### Entry point

Add a function:

- `sendImmediateNotifications(changeReportId: string)`

Flow:

1. Load pending deliveries for the report.
2. Select only users with `role in (PAID, ADMIN)`.
3. For each delivery:
   - validate delivery/user/channel/report presence
   - render immediate template
   - call transport
   - update row status

### Concurrency

For now:

- process sequentially or with very small concurrency

Reason:

- this is Phase 2
- queue/concurrency management belongs to the later Bull integration

### Idempotency

Only select:

- `status = PENDING`

This guarantees reruns do not re-send already sent emails.

## Free-user digest implementation plan

### Entry point

Add a function:

- `sendPendingDigests(now = new Date())`

### Eligibility rule

A free user is eligible if:

- `role = FREE`
- has active default email channel
- has at least one pending email delivery
- `last_digest_sent_at` is null or `<= now - 6 hours`

### Aggregation rule

Gather pending deliveries for that user where:

- delivery `status = PENDING`
- linked report/items exist

Group them by:

- category
- report

Then render a single digest email.

### Post-send state updates

On success:

- mark included deliveries `SENT`
- set `sent_at` on each included delivery
- update `users.last_digest_sent_at`

On failure:

- keep included deliveries `PENDING` for transient transport/provider/network failures
- mark included deliveries `SKIPPED` only for deterministic data or eligibility problems
- leave `last_digest_sent_at` unchanged

Recommended transactional rule:

- perform send outside the DB transaction
- perform final delivery/user updates in one transaction after the provider call returns

This avoids holding DB transactions open while waiting on network I/O.

## Edge cases

### Delivery references missing report

Behavior:

- mark delivery `SKIPPED`

Reason:

- bad data should not block other deliveries

### User unsubscribed or channel disabled after delivery row was created

Behavior:

- immediate flow: mark `SKIPPED`
- digest flow: mark `SKIPPED`

### Free user upgraded to paid before digest send

Behavior:

- simplest phase-2 rule:
  - immediate sender handles only newly created paid deliveries for later reports
  - older pending free deliveries remain digest-eligible

Alternative behavior is possible later, but do not complicate phase 2 with migration logic.

### Paid user downgraded to free before immediate send

Behavior:

- immediate sender checks current user role at send time
- if no longer `PAID` or `ADMIN`, mark `SKIPPED`
- the digest job can pick up future pending free deliveries

### No active default email channel

Behavior:

- mark affected delivery `SKIPPED`

### Partial digest send failure

Behavior:

- if one user’s digest send fails, only that user’s deliveries should be affected
- continue processing other users

### Empty digest after filtering

Behavior:

- do not send email
- do not update `last_digest_sent_at`

## Tests to implement

### Delivery state transition tests

File:

- `backend/src/notifications/send-immediate.test.ts`

Cases:

- paid pending delivery -> `SENT` on successful transport
- paid pending delivery -> `FAILED` on transport error
- free pending delivery is ignored by the immediate sender and remains `PENDING`
- delivery with inactive channel -> `SKIPPED`
- rerun does not resend `SENT` deliveries

### Template tests

File:

- `backend/src/notifications/templates.test.ts`

Cases:

- immediate email renders category, counts, product links, and price/stock transitions
- digest email groups changes by category/report correctly
- plain-text fallback renders required information
- special characters in product names are escaped correctly

### Digest tests

File:

- `backend/src/notifications/send-digest.test.ts`

Cases:

- eligible free user gets one digest email for multiple pending deliveries
- successful digest marks included deliveries `SENT`
- successful digest updates `last_digest_sent_at`
- recent `last_digest_sent_at` blocks digest send
- transient transport failure leaves included deliveries `PENDING`
- ineligible deliveries are `SKIPPED`
- users are isolated from each other in batch processing

### Integration tests

File:

- `backend/src/notifications/flow.test.ts`

Cases:

- diff-created paid delivery is sent by immediate flow
- diff-created free deliveries remain pending until digest flow
- digest flow processes multiple reports for one free user into one email
- no duplicate sends on rerun

## Manual verification

### Immediate paid flow

1. Create a paid user with a default email channel.
2. Run a scrape that produces a `change_report`.
3. Trigger immediate send.
4. Verify:
   - email transport called once
   - delivery marked `SENT`
   - subject/body match the report

### Free digest flow

1. Create a free user subscribed to multiple categories.
2. Generate multiple pending deliveries across reports.
3. Run digest send.
4. Verify:
   - one email sent for that user
   - included deliveries marked `SENT`
   - `last_digest_sent_at` updated

## Suggested implementation order

1. Add notification transport abstraction.
2. Add template rendering and template tests.
3. Add immediate-send service plus delivery-state tests.
4. Add digest aggregation service plus digest tests.
5. Add high-level integration tests for paid and free flows.
6. Add CLI entrypoints for manual local runs.

## Definition of done

This phase is complete when:

- pending delivery rows can be converted into real emails
- delivery status transitions are covered by backend tests
- paid users receive immediate emails
- free users receive 6-hour digests from pending deliveries
- delivery reruns are idempotent for already sent rows
- the implementation works with Nodemailer locally and Resend in production
