# NOTIFICATION_SURFACE_COLORS_IMPLEMENTATION.md

## Status

Implemented.

## Summary

Add variant-based surface styling to the shared notification system (`AppNotificationProvider`) so each notification variant has clear visual hierarchy, readable contrast, and consistent behavior in light and dark themes.

## Scope

1. Shared notification rendering (`frontend/src/shared/notifications/*`).
2. Theme tokens in `frontend/src/styles/abstracts/_variables.scss`.
3. Notification provider tests and style assertions.
4. No payload API changes for callers (`notify({ variant, message, ... })` remains unchanged).

## Requested Variant Mapping

1. `success`: green background.
2. `error`: amber/yellow background.
3. `info`: white background.
4. `warning`: red background.

## UX Risk Note (Decision)

This mapping is intentionally non-standard (`error` is usually red, `warning` is usually amber).  
To prevent confusion, this mapping must be documented in tokens and tests as a product decision.

## UX Requirements

1. Contrast:
    1. Message and description text must meet WCAG AA (>= 4.5:1) against each variant background.
    2. Icons and action controls must remain readable on each background.
2. Redundancy:
    1. Keep icon differentiation for each variant (not color-only semantics).
3. Toast behavior:
    1. `error` and `warning` should persist longer than `success` and `info`.
    2. Keep dedupe behavior through existing `key` support to avoid repetitive spam.
4. Mobile layout:
    1. Long descriptions must wrap without clipping.
    2. Action area must remain usable on narrow screens.
5. Visual hierarchy:
    1. Notifications must remain elevated overlays (border/shadow preserved), not blend into page cards.

## Technical Design

## 1) Add Notification Tokens

In both light and dark theme sections of `_variables.scss`, add:

1. `--notification-success-bg`
2. `--notification-success-border`
3. `--notification-success-text`
4. `--notification-error-bg`
5. `--notification-error-border`
6. `--notification-error-text`
7. `--notification-info-bg`
8. `--notification-info-border`
9. `--notification-info-text`
10. `--notification-warning-bg`
11. `--notification-warning-border`
12. `--notification-warning-text`

Optional helper tokens if needed:

1. `--notification-title-weight`
2. `--notification-shadow`
3. `--notification-action-text`

## 2) Add Shared Notification Styles

Create:

1. `frontend/src/shared/notifications/notification.module.scss`

Styles must target Ant notification container and content for each variant class:

1. Background + border from notification tokens.
2. Title and description text color from notification tokens.
3. Icon color harmonized with text color.
4. Action button/link styling with visible focus ring.
5. Mobile-safe wrapping and spacing.

Required selector strategy:

1. Apply a local wrapper class per variant through `api.open({ className })`.
2. Style Ant internals from that wrapper using explicit `:global(.ant-notification-...)` selectors.
3. Do not rely on unscoped global overrides; all variant styling must be namespaced by the wrapper class.

## 3) Wire Variant Class in Provider

Update `frontend/src/shared/notifications/notification-provider.tsx`:

1. Map `variant` -> CSS module class (`success`, `error`, `info`, `warning`).
2. Pass class via `api.open({ className })`.
3. Keep existing icon + duration behavior.

## 4) Keep Notification API Stable

No change to:

1. `AppNotificationPayload` shape.
2. Existing `notify(...)` callsites.
3. Existing notification key dedupe behavior.

## 4.1) Notification Key Policy (Dedupe)

1. High-frequency flows must use stable keys to prevent toast spam:
    1. sign-in failure: `auth:login:failed`
    2. sign-out failure: `session:logout`
    3. settings save actions: existing `settings:*` keys
2. If no key is provided, behavior remains unchanged (non-deduped ad hoc toast).
3. This policy must be documented alongside `NOTIFICATION_FEEDBACK_MATRIX.md`.

## 5) Test Updates

Update/extend:

1. `frontend/src/shared/notifications/notification-provider.test.tsx`

Add assertions for:

1. Variant class assignment per variant.
2. Icon still matches variant.
3. Notification still renders message/description/action as before.
4. Portal-safe rendering checks:
    1. Use `waitFor` around DOM queries for Ant notification portal output.
    2. Assert wrapper class is present on rendered Ant notification node.
    3. Verify variant class is applied for all four variants.
5. Key dedupe behavior:
    1. Trigger same keyed notification twice and assert only latest rendered instance is present.

## Accessibility Checks

1. Toast content remains announced (no ARIA regression from custom classing).
2. Action button remains keyboard-focusable with visible focus style.
3. Color contrast checks pass in both themes for all variants.

## Contrast Validation Method

1. Token-level validation:
    1. Verify each `--notification-*-text` vs `--notification-*-bg` pair is >= 4.5:1.
    2. Verify action control text/focus visibility against each variant background.
2. Add verification notes with measured ratios in PR description for light and dark themes.

## Verification Commands

1. `npm run typecheck --workspace=frontend`
2. `npm run lint --workspace=frontend`
3. `npm run test --workspace=frontend`
4. `npm run build --workspace=frontend`

## Acceptance Criteria

1. All four variants render distinct backgrounds according to requested mapping.
2. Styles are driven by tokens (no hardcoded one-off colors in provider/component code).
3. Text/icons/actions are readable in light and dark themes.
4. Notification UX remains consistent on desktop and mobile.
5. Frontend typecheck/lint/tests/build pass.

## Rollout Notes

1. Ship as a single frontend release (provider + tokens + styles + tests together).
2. Validate with at least one real flow per variant:
    1. success: profile save
    2. error: failed sign-in
    3. info: informational action (if available)
    4. warning: warning path (or test harness trigger)
3. Run visual regression checklist on existing notification entry points to avoid unintended styling regressions:
    1. auth flows (`/login`, `/register`, `/forgot-password`)
    2. app shell logout feedback
    3. settings account/tracking/notifications/admin actions
