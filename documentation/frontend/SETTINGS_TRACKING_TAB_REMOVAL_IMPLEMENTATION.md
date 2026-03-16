# Settings Tracking Tab Removal Implementation

## Status

Planned (March 16, 2026).

## Summary

Remove the `Tracking` tab from Settings and remove the `Track a product` link from Dashboard Tracking Overview.

## Goals

1. Simplify Settings IA by removing tracking management from Settings.
2. Keep Dashboard Tracking Overview focused on category tracking and untracking actions.
3. Preserve safe deep-link behavior for existing `?tab=tracking` URLs.
4. Keep a clear product-tracking entry flow after removal.

## Product Decision (Required)

1. Product tracking entry point after this change:

- Users track products from Product Detail via `Watch product`.
- Users can reach Product Detail from Changes Explorer / Run Detail rows.

2. Dashboard will no longer provide a direct product-tracking shortcut.

## Scope

1. Include:

- Settings tab/search/default updates.
- Settings navigation/panel removal for Tracking.
- Dashboard `Track a product` link removal.
- Test updates for settings routing and dashboard UI.

2. Exclude:

- Backend API changes.
- Tracking slot policy changes.
- Product watch/unwatch mutation behavior.

## Target Files

1. Settings search/schema/type layer:

- `frontend/src/features/settings/schemas.ts`
- `frontend/src/features/settings/search.ts`
- `frontend/src/features/settings/types/settings-schema.types.ts`

2. Settings tab registry and behavior:

- `frontend/src/features/settings/constants/settings.constants.ts`
- `frontend/src/features/settings/hooks/use-settings-tabs.ts`
- `frontend/src/features/settings/components/settings-tabs.tsx`
- `frontend/src/features/settings/views/settings-page/SettingsPageView.tsx`

3. Settings tracking tab implementation cleanup:

- `frontend/src/features/settings/hooks/use-settings-tracking.ts`
- `frontend/src/features/settings/views/settings-page/components/settings-tracking-tab/SettingsTrackingTab.tsx`
- `frontend/src/features/settings/views/settings-page/components/settings-tracking-tab/settings-tracking-tab.types.ts`

4. Dashboard link removal:

- `frontend/src/features/runs/components/dashboard/dashboard-tracking-table-section.tsx`

5. Tests:

- `frontend/src/routes/settings-page.test.tsx`
- `frontend/src/routes/scrape-views.test.tsx`

## Implementation Plan

1. Update tab model:

- Remove `tracking` from `SettingsTab` runtime enum used by UI.
- Update tab labels/order to remove Tracking.

2. Implement schema-level compatibility mapping (not view-level):

- Accept legacy `tracking` in search parsing input.
- Coerce `tracking -> account` inside `parseSettingsSearch`.
- Ensure parser never throws for stale `tab=tracking` links.

3. Update Settings page composition:

- Remove `useSettingsTracking` usage from `SettingsPageView`.
- Remove `SettingsTrackingTab` rendering block.
- Keep existing `subscriptions` usage for summary/plan via `useSubscriptionsQuery` directly.

4. Remove dashboard shortcut:

- Delete `Track a product` link from Dashboard Tracking Overview controls.

5. Codebase cleanup:

- Remove dead imports/types/components only after all references are removed.
- Keep deletion as a final cleanup step to avoid intermediate compile breakage.

## Compatibility Phase (Strict)

1. One-release fallback window:

- `?tab=tracking` must resolve to `account` deterministically.

2. Telemetry required (not optional):

- Emit `settings_tab_legacy_fallback` event when fallback is used.
- Include original tab value and route path.

3. Sunset criteria:

- Remove fallback only after fallback-hit volume is near zero across one release cycle.

## Test Plan

1. Settings routing tests:

- `/app/settings` renders and defaults to Account.
- `/app/settings?tab=tracking` resolves to Account and does not error.
- Browser back/forward keeps stable valid tab state.

2. Settings UI tests:

- Tracking tab is absent from desktop tabs and mobile select.
- Tab keyboard navigation and selection remain valid across remaining tabs.

3. Dashboard tests:

- `Track a product` link is absent.
- Category tracking controls and table actions still work.

4. Regression tests:

- Existing Account/Notifications/Plan/Admin tab behavior remains intact.
- Product Detail `Watch product` flow remains available.

## Acceptance Criteria

1. Settings no longer displays `Tracking` in any nav variant.
2. `tab=tracking` deep links are safely coerced to `account`.
3. Dashboard Tracking Overview no longer shows `Track a product`.
4. Product tracking remains reachable via Product Detail `Watch product`.
5. Frontend lint, typecheck, and impacted tests pass.

## Risks and Mitigations

1. Risk: stale deep links fail parsing.

- Mitigation: parser-level coercion in `parseSettingsSearch`.

2. Risk: hidden coupling to removed tracking hook/components.

- Mitigation: staged removal + compile/lint + targeted route tests.

3. Risk: product tracking discoverability drops.

- Mitigation: explicitly retain and validate Product Detail watch CTA flow.

## Implementation Checklist

1. `tracking` removed from tab enum/order/labels.
2. `parseSettingsSearch` supports legacy `tracking` input and coerces to `account`.
3. Settings page no longer imports `useSettingsTracking` or `SettingsTrackingTab`.
4. Dashboard section no longer renders `Track a product` link.
5. Settings and dashboard route tests updated and passing.
6. Dead tracking-tab files removed or explicitly deprecated.
7. Telemetry event for legacy fallback added and verified.

## Verification Commands

1. `npm run lint --workspace=frontend`
2. `npm run typecheck --workspace=frontend`
3. `npm run test --workspace=frontend -- src/routes/settings-page.test.tsx`
4. `npm run test --workspace=frontend -- src/routes/scrape-views.test.tsx`
