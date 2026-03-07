# Ant Design And Notification Implementation Plan

## Summary

Integrate Ant Design into the frontend, but limit Phase 1 scope to **notification feedback only**.  
Use Ant Design notifications as a centralized success/failure feedback channel for user actions (especially settings mutations), without migrating existing form controls or layout components.

## Why This Change

Current UI behavior is inconsistent for mutation feedback:

- many actions show pending states but no explicit success confirmation
- several failure states are only visible as inline text (or not shown at all)
- there is no shared notification system across views

Ant Design notifications give us a fast, accessible, consistent mechanism to solve this gap with minimal visual churn.

## Scope

In scope:

- install Ant Design in `frontend`
- create a single app-level notification provider abstraction
- expose a shared `useAppNotification()` hook
- wire notifications into existing mutation-heavy flows
- add tests for notification behavior in hooks/components

Out of scope (for this plan):

- replacing existing inputs/buttons/tables with Ant components
- introducing Ant form system
- broad design-system migration
- backend API contract changes

## Architecture Decisions

1. Ant Design is used only for notifications in this slice.
2. Notifications are triggered through an internal wrapper API, not direct `antd` calls in every component.
3. Notification triggering lives primarily in mutation hooks (feature logic layer), not presentational components.
4. Existing inline validation stays in place; notifications supplement action-level feedback.

## Technical Approach

## 1. Dependency Setup

Install in frontend workspace:

- `antd`
- `@ant-design/icons`

Use Ant icons for notification variants to keep visual language consistent.

## 2. App-level Notification Provider

Add a provider module, for example:

- `frontend/src/shared/notifications/notification-provider.tsx`
- `frontend/src/shared/notifications/notification-context.ts`
- `frontend/src/shared/hooks/use-app-notification.ts`
- `frontend/src/shared/notifications/types/notification.types.ts`

Provider responsibilities:

- initialize Ant notification API via `notification.useNotification()`
- render Ant `contextHolder` once near app root
- expose a payload-first API from the hook:
    - `notify(payload)`

Recommended payload contract (single source of truth):

```ts
type AppNotificationVariant = "success" | "error" | "info" | "warning";

interface AppNotificationAction {
    label: string;
    onClick: () => void;
}

interface AppNotificationPayload {
    variant: AppNotificationVariant;
    message: string;
    description?: string;
    key?: string;
    durationSeconds?: number;
    action?: AppNotificationAction;
    requestId?: string;
}
```

The shared hook returns `notify(payload)` so feature code never imports Ant directly.

## 3. Root Wiring

Update `frontend/src/main.tsx` to wrap app with notification provider.

Current:

- `QueryClientProvider`
- `RouterProvider`

Target:

- `QueryClientProvider`
- `AppNotificationProvider`
- `RouterProvider`

## 4. Message Standards

Define shared copy constants:

- `frontend/src/shared/constants/notification-messages.ts`

Guidelines:

- short title + clear one-line description
- no raw backend internals
- map known API errors to user-friendly text (reuse existing normalize-user-error logic)

## 5. First-Wave Integration Targets

Wire notifications into high-impact actions first.

### Settings: Account

- profile update success
- profile update failure

### Settings: Tracking

- track category success/failure
- untrack category success/failure

### Settings: Notifications

- add channel success/failure
- set default success/failure
- toggle active success/failure
- delete channel success/failure

### Settings: Admin

- save scrape interval success/failure
- trigger run accepted/failure

### Auth and Session

- logout failure notification
- keep existing inline field validation in login/register forms

## 6. Error Handling Rules

1. Use normalized user-safe messages by default.
2. Avoid duplicate feedback for the same event:
    - field validation stays inline
    - mutation-level result goes to notification
3. Prevent notification spam:
    - use key-based updates for repeated pending->result flows when needed
    - avoid firing duplicate success notifications on rapid retries

## 7. Accessibility Rules

1. Notifications must be readable without color-only cues.
2. Notification content must be concise and action-oriented.
3. Keep inline error text for form fields; do not force users to rely only on transient toasts.
4. Use semantic language: success, failed, and next step when relevant.
5. Notifications must be keyboard dismissible and not trap focus.
6. Notification announcements should use polite live-region behavior and not interrupt active form input.
7. Respect reduced-motion preferences for notification animation where supported.

## 8. Notification UX Contract

Define one shared behavior profile so feedback feels predictable across all views:

1. Placement: top-right on desktop, top-center on narrow/mobile widths.
2. Duration:
    - success/info: short auto-close (for example 3-4s)
    - warning: medium auto-close
    - error: longer auto-close or persistent when user action is required
3. Max visible notifications: capped (for example 3) to avoid stack overload.
4. Duplicate suppression:
    - reuse keyed notifications for pending->success/failure transitions
    - avoid showing repeated success for identical actions in rapid sequence
5. Actionable failures:
    - include next-step language ("Try again", "Check input", "Open settings")
    - include optional CTA/link only when recovery path is clear
6. Tone and content:
    - concise title + one actionable sentence
    - no raw technical internals for non-admin users
7. Error source policy:
    - field validation remains inline
    - mutation result gets notification
    - page/query load failures stay inline on the page unless global handling is required (e.g., auth expiry)

## 9. Variant Icon Mapping

Use explicit Ant Design icons per variant through the wrapper so feature code never decides icons ad hoc:

1. `success` -> `CheckCircleOutlined`
2. `error` -> `CloseCircleOutlined`
3. `info` -> `InfoCircleOutlined`
4. `warning` -> `WarningOutlined`

Rules:

1. Icon mapping lives in one shared file, not in feature hooks.
2. Each variant always uses the same icon for consistency and recognition.
3. Icon and title must both convey state (not color-only semantics).

## 10. Consolidated Fixes To Apply

Implement these seven fixes directly in this slice:

1. Strict notification contract in shared config:
    - add `frontend/src/shared/constants/notification-config.ts`
    - centralize placement, durations, max visible, dedupe defaults
2. Actionable failure patterns:
    - extend message model with `nextStep` and optional CTA metadata
3. Accessibility behavior lock:
    - keyboard dismissal, no focus trap/steal, polite announcements
4. Feedback matrix as source of truth:
    - map view/action -> pending/success/failure/recovery behavior
5. Race/spam handling:
    - keyed notifications and stale-response protection
    - request identity model:
        - generate request id in mutation hooks
        - include `requestId` in payload
        - only show final notification for latest request id per logical action key
6. UX-critical test expansion:
    - duplicate click, out-of-order results, navigation during pending, auth-expiry
7. Localization-ready copy layer:
    - all message copy centralized and reusable, no hardcoded feature strings

## 11. Feedback Matrix Requirement

Create a compact matrix document in frontend documentation:

- `documentation/frontend/NOTIFICATION_FEEDBACK_MATRIX.md`

Required columns:

1. view/screen
2. user action
3. pending feedback
4. success feedback
5. failure feedback
6. recovery action
7. notification key/dedupe strategy

This matrix must be updated whenever a new mutation flow is added.

## File Plan

New files:

- `frontend/src/shared/notifications/notification-provider.tsx`
- `frontend/src/shared/notifications/notification-context.ts`
- `frontend/src/shared/hooks/use-app-notification.ts`
- `frontend/src/shared/notifications/types/notification.types.ts`
- `frontend/src/shared/constants/notification-messages.ts`
- `frontend/src/shared/constants/notification-config.ts`
- `frontend/src/shared/notifications/notification-icons.tsx`
- `documentation/frontend/NOTIFICATION_FEEDBACK_MATRIX.md`

Updated files (expected):

- `frontend/src/main.tsx`
- settings hooks under `frontend/src/features/settings/hooks/*`
- optional: auth/session hook(s) where logout is handled

## Testing Plan

Testing strategy is **test-first** and driven by user stories + edge cases.

Implementation rule:

1. Write failing tests from user stories and edge cases before notification implementation.
2. Implement the minimum code to satisfy tests.
3. Refactor without changing behavior.
4. Re-run tests repeatedly during each integration step.

Mandatory run cadence during implementation:

1. after provider/wrapper setup
2. after each settings tab integration (`account`, `tracking`, `notifications`, `admin`)
3. after auth/session integration
4. final full pass before merge

Recommended command cadence:

- `npm run test --workspace=frontend`
- run focused test files during feature iteration, then full suite repeatedly
- run full build check at least twice (midpoint and final)

## Unit Tests

1. provider exposes notification API via hook
2. hook throws useful error if used outside provider
3. message mapping utilities return safe fallback copy
4. variant-to-icon mapping returns correct Ant icon for each type
5. notification config defaults (duration/placement/maxCount) are respected by wrapper
6. payload-first API validates and normalizes optional fields (`key`, `durationSeconds`, `action`, `requestId`)
7. stale-response helper only allows latest request id to emit final notification per action key

## Feature Tests

1. settings account save triggers success notification on success
2. settings tracking create/delete trigger success and failure notifications
3. settings notifications mutations trigger correct feedback
4. settings admin mutations trigger accepted/success/failure feedback
5. duplicate-click behavior does not emit duplicate success notifications
6. out-of-order mutation completion does not show stale/incorrect final feedback
7. route change during pending mutation does not produce broken notification state
8. auth-expired mutation path shows clear one-time failure guidance
9. actionable failure notification can expose retry/help action metadata when provided

## Integration Tests

At least one integration test must render:

1. real `AppNotificationProvider`
2. real hook usage (`notify(payload)`)
3. rendered notification content and mapped icon in the DOM

This test must not fully mock the notification provider/hook layer.

Implementation note:

- mock notification hook in component tests where needed
- avoid asserting Ant internals; assert our wrapper calls with expected payload
- keep one provider-level integration test with real provider wiring to catch adapter regressions

## UX User Stories (Additional)

1. As a user, when I save settings successfully, I get a short confirmation so I know the action completed.
2. As a user, when an action fails, I get a clear reason and an immediate next step.
3. As a keyboard-only user, I can dismiss notifications without using a mouse.
4. As a screen-reader user, notifications are announced without disrupting form completion.
5. As a mobile user, notifications do not cover critical buttons or fields.
6. As a user on a slow connection, I see one stable feedback state instead of stacked repeated toasts.
7. As a user, rapid repeated clicks on the same action do not create duplicate success messages.
8. As an admin, after triggering a scrape, I see acceptance feedback and a run-detail link when available.
9. As a user with an expired session, I see one clear auth-related notification and expected redirect behavior.
10. As a user in a localized UI, notification copy remains consistent with app language/tone.
11. As a user, notification state always includes an icon that matches success/error/info/warning semantics.

## UX Edge Cases

1. Double-click on mutation buttons triggers duplicate requests.
2. Earlier request fails after a later retry succeeds (race/out-of-order completion).
3. User navigates away while a mutation is in flight.
4. Offline, timeout, and intermittent network failures.
5. Unknown backend error code requiring safe fallback messaging.
6. `401` response during mutation on a dirty form.
7. Multi-tab usage causing near-simultaneous conflicting mutations.
8. Long server error text that can overflow or degrade readability.
9. Burst actions (toggle default/active repeatedly) causing notification spam.
10. Admin trigger accepted by API but downstream queue/worker fails shortly afterward.
11. Variant icon mismatch due to refactor or incorrect mapping in one feature flow.

## Rollout Sequence

1. Install `antd` and `@ant-design/icons`, then add provider/hook abstraction.
2. Write test cases from user stories + edge cases before feature wiring.
3. Add shared config, icon mapping, and message standards.
4. Wire root provider in `main.tsx`.
5. Implement settings mutation feedback in phases with repeated test runs after each tab.
6. Implement logout failure handling and auth-expiry behavior.
7. Publish/update feedback matrix for covered flows.
8. Run repeated full test/build verification before completion.

## Risks And Mitigations

1. **Risk:** inconsistent phrasing across teams  
   **Mitigation:** central message constants, localization-ready copy model, and feedback matrix review.

2. **Risk:** notification overuse causing noise  
   **Mitigation:** strict contract defaults, dedupe keys, max visible cap, and no toast-for-everything policy.

3. **Risk:** coupling to Ant API across app  
   **Mitigation:** enforce wrapper hook usage; no direct `antd` imports in features.

4. **Risk:** visual mismatch with existing CSS modules  
   **Mitigation:** keep scope to transient notifications first; no layout component migration.

5. **Risk:** icon inconsistency across features  
   **Mitigation:** enforce centralized variant->icon mapping via shared wrapper.

6. **Risk:** regressions during incremental integration  
   **Mitigation:** test-first workflow and repeated test runs at each implementation checkpoint.

7. **Risk:** wrapper API fragmentation across features  
   **Mitigation:** enforce payload-first `notify(payload)` only; disallow ad hoc variant helper methods in feature code.

## Acceptance Criteria

1. Ant Design is installed and configured in frontend.
2. A shared notification provider + hook exists and is used by features.
3. Settings actions show consistent success/failure notifications.
4. Logout failure has visible feedback.
5. Inline field validation still works as before.
6. Frontend tests cover key notification flows.
7. Notification variants consistently show mapped Ant icons for success/error/info/warning.
8. Feedback matrix exists and matches implemented flows.
9. User-story and edge-case tests are written first and executed repeatedly during implementation.
10. At least one integration test uses real provider + real notification rendering.
11. `npm run test --workspace=frontend` and `npm run build --workspace=frontend` pass after integration.

## Future Expansion (Explicitly Deferred)

- use Ant `message` for lightweight ephemeral status where notification is too heavy
- theme token alignment between Ant and existing SCSS design tokens
- optional migration of selected high-friction components (forms/tables) after notification layer proves stable
