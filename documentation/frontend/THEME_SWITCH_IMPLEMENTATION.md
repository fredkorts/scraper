# Theme Switch Implementation Plan

## Status

Implemented (March 8, 2026).

## Summary

Introduce a reusable shared `AppThemeSwitch` component based on Ant Design `Switch` and use it in the app header to toggle between light and dark themes.
The switch placement is locked to the header actions row before the username and logout button.

The switch will display:

1. `Sun` icon for light mode.
2. `Moon` icon for dark mode.

The implementation extends the existing theme system (`AppThemeProvider`, `useSystemTheme`) to support explicit user preference and persistence.

## Goals

1. Add a shared switch component for theme toggling.
2. Let users explicitly choose light or dark mode.
3. Persist theme choice across sessions.
4. Keep Ant Design tokens and CSS variable theming in sync.
5. Preserve accessibility and keyboard behavior.

## Non-Goals

1. No palette redesign in this phase.
2. No per-route theme behavior.
3. No additional “theme presets” beyond light/dark.

## Current State

1. Theme state is read from `prefers-color-scheme` only.
2. No manual user toggle exists.
3. `AppThemeProvider` already maps CSS tokens into Ant Design theme config.

Relevant files:

1. `frontend/src/app/theme-provider.tsx`
2. `frontend/src/app/theme/use-system-theme.ts`
3. `frontend/src/app/theme/theme-token-reader.ts`
4. `frontend/src/routes/app-layout.tsx`

## Architecture Decisions

## Theme source of truth

Use a small app-level theme state with persisted preference:

1. `themePreference`: `"light" | "dark" | null`
2. `null` means “follow system preference”.

Effective mode resolution:

1. if preference is `"light"` -> light.
2. if preference is `"dark"` -> dark.
3. if preference is `null` -> use `matchMedia("(prefers-color-scheme: dark)")`.

Switch behavior is locked:

1. `AppThemeSwitch.checked` is always bound to effective `isDarkMode`.
2. Toggle writes explicit preference:
    1. toggled on -> `"dark"`
    2. toggled off -> `"light"`
3. The switch is strictly two-state (no tri-state UI for `null`).

## Persistence

Use `localStorage` key:

1. `pricepulse.theme`

Storage key ownership is locked:

1. define `APP_THEME_STORAGE_KEY` in `frontend/src/app/theme/constants/theme.constants.ts`
2. all readers/writers/tests import this constant (no hardcoded duplicates)

Value:

1. `"light"` or `"dark"`
2. key removed when clearing preference (optional helper)

## DOM application

Set a single attribute on `<html>`:

1. `data-theme="light"` or `data-theme="dark"`

This must drive existing CSS variable themes and Ant token reading consistently.

Pre-render bootstrap is required to avoid first-paint flash:

1. before React mounts, read stored preference/system mode.
2. set `document.documentElement.dataset.theme` immediately.
3. React provider must initialize from the same resolved value.

Bootstrap location is locked:

1. run bootstrap before `createRoot(...)` in `frontend/src/main.tsx`
2. do not duplicate bootstrap in multiple entry points

## Shared component contract

Create:

1. `frontend/src/components/app-theme-switch/AppThemeSwitch.tsx`
2. `frontend/src/components/app-theme-switch/types/app-theme-switch.types.ts`
3. optional `frontend/src/components/app-theme-switch/app-theme-switch.module.scss`

Props:

1. `isDarkMode: boolean`
2. `disabled?: boolean`
3. `onToggle: (nextIsDarkMode: boolean) => void`
4. `ariaLabel?: string`

UI behavior:

1. Uses Ant `Switch`.
2. `checkedChildren`: moon icon.
3. `unCheckedChildren`: sun icon.
4. Controlled component only.

## Implementation Plan

## 1) Add theme preference hook/state

Add a dedicated hook to own theme preference and effective mode:

1. `frontend/src/app/theme/hooks/use-app-theme-preference.ts`
2. `frontend/src/app/theme/constants/theme.constants.ts`

Responsibilities:

1. read persisted preference from localStorage.
2. subscribe to system preference changes.
3. compute `isDarkMode`.
4. expose `setThemePreference`.
5. write/remove localStorage and update `document.documentElement.dataset.theme`.

## 2) Update theme provider

Update:

1. `frontend/src/app/theme-provider.tsx`

Changes:

1. replace direct `useSystemTheme()` dependency with new preference hook.
2. keep existing token mapping logic.
3. expose one locked API only:
    1. `AppThemeContext`
    2. `useAppTheme()`
4. `useAppTheme()` returns:
    1. `isDarkMode`
    2. `themePreference`
    3. `setDarkMode(next: boolean)`
    4. optional `clearThemePreference()`

## 3) Build shared switch component

Create `AppThemeSwitch` wrapping Ant `Switch`:

1. use `SunOutlined`/`MoonOutlined` (or filled variants if preferred).
2. provide sensible default `ariaLabel` (`"Toggle dark mode"`).
3. keep size/style aligned with header controls.

## 4) Wire switch into app layout

Update:

1. `frontend/src/routes/app-layout.tsx`
2. `frontend/src/routes/app-layout.module.scss`

Placement:

1. inside header actions.
2. visual order must be:
    1. `AppThemeSwitch`
    2. username text
    3. logout button

Behavior:

1. toggle updates theme immediately.
2. persists across refresh/navigation.

## 5) Ensure CSS variable compatibility

Update theme variable strategy (locked):

1. migrate tokens to explicit root blocks:
    1. `:root[data-theme="light"]`
    2. `:root[data-theme="dark"]`
2. keep all existing token names unchanged to avoid broad component churn.
3. remove theme-critical dependency on `@media (prefers-color-scheme: dark)` for app theming decisions.

## 6) Tests

Add/Update tests:

1. `AppThemeSwitch` unit tests:
    1. renders with correct icon/state.
    2. calls `onToggle` with expected value.
    3. accessible label exists.
2. theme preference hook/provider tests:
    1. loads persisted preference.
    2. falls back to system when no preference.
    3. updates `data-theme` and localStorage on toggle.
    4. remains stable under React StrictMode re-renders.
    5. cleans up `matchMedia` listeners on unmount.
    6. no preference + system dark => switch checked by default.
3. app layout integration test:
    1. switch visible in header.
    2. header order is `switch -> username -> logout`.
    3. toggle changes effective mode and `checked` state.
4. bootstrap test:
    1. initial `data-theme` is set before first app paint logic executes.

## User Stories

1. As a user, I can switch the app to dark mode and keep it after page reload.
2. As a user, I can switch back to light mode at any time.
3. As a keyboard user, I can toggle theme with standard switch keyboard interactions.

## Edge Cases

1. `localStorage` unavailable (private mode restrictions):
    1. fallback to in-memory + system mode without crash.
2. SSR-like environments (`window` missing):
    1. safe guards in token/pref readers.
3. system theme changes while user has explicit preference:
    1. explicit preference wins.
4. system theme changes with no preference:
    1. UI updates automatically.
5. first-load flash risk:
    1. bootstrap path must set `data-theme` before provider render.

## Acceptance Criteria

1. Header includes a reusable `AppThemeSwitch`.
2. Header actions order is switch -> username -> logout.
3. Switch uses sun/moon icon states.
4. Theme toggle updates UI immediately.
5. Preference persists across reloads.
6. Ant components and CSS variables remain visually consistent per active theme.
7. Accessibility checks pass for the switch.

## Verification Commands

1. `npm run lint --workspace=frontend`
2. `npm run test --workspace=frontend`
3. `npm run build --workspace=frontend`
