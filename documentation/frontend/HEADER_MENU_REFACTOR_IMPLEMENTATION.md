# HEADER_MENU_REFACTOR_IMPLEMENTATION.md

## Status

Implemented.

## Summary

Simplify header navigation by making `PricePulse` logo the home link, removing inline `Home/Runs/Settings` links, and introducing a single accessible account menu (Ant Design-based) with iconed actions for Settings, a `Toggle theme` action, and logout.

## Goals

1. Reduce visual noise in header.
2. Keep core navigation discoverable.
3. Preserve all current capabilities (settings access, `Toggle theme` action, logout).
4. Meet accessibility best practices for keyboard and screen reader users.
5. Reuse existing shared primitives and notification/logout flows.

## Non-Goals

1. Reworking dashboard page content.
2. Removing runs route or runs functionality.
3. Changing auth/session behavior.
4. Introducing a new design system pattern outside current Ant + token stack.

## UX Decisions

1. Logo becomes the home navigation affordance (`/app` with default dashboard search).
2. Remove inline center nav links entirely.
3. Add one menu trigger in header actions area.
    1. Trigger must include visible label text (for example `Menu` or user name), not icon-only.
4. Menu contains:
    1. `Settings` (with icon)
    2. `Toggle theme` action item (with icon + current state in label)
    3. Divider
    4. `Log out` action (with icon)
5. “Runs” remains reachable from existing “View all runs” dashboard CTA.
6. Navigation must preserve existing route search defaults:
    1. logo/home uses `defaultDashboardHomeSearch`
    2. settings action uses `defaultSettingsSearch`

## Information Architecture

1. Primary: Logo -> Home
2. Secondary actions: Account menu
3. Contextual deep-link to runs: Dashboard CTA

## Accessibility Requirements

1. Menu trigger:
    1. `aria-label="Open account menu"`
    2. `aria-expanded` synced with popup state
    3. use `aria-haspopup="menu"`; add `aria-controls` only if popup id is stable
    4. include visible trigger text for discoverability and non-AT users
2. Keyboard:
    1. `Enter`/`Space` opens
    2. arrow keys navigate items
    3. `Esc` closes and returns focus to trigger
3. Theme toggle action:
    1. replace switch with a menu action `Toggle theme`
    2. menu label includes current mode context (`Toggle theme (currently Dark)` or `Toggle theme (currently Light)`)
    3. item remains keyboard-activatable like other menu actions
4. Logout action:
    1. interactive semantics (`button`/menu item action)
    2. disabled/loading state while pending
5. Focus treatment:
    1. visible focus ring for trigger/items
    2. focus restore to trigger on close
6. Touch targets:
    1. at least 44x44 for trigger and actionable rows
7. Contrast:
    1. menu text/icon/background pass WCAG AA

## Icon Mapping

1. Settings: `SettingOutlined`
2. Toggle theme:
    1. dark active: `MoonOutlined`
    2. light active: `SunOutlined`
3. Log out: `LogoutOutlined`
4. Optional user header (if shown): `UserOutlined`

## Interaction Contract (Ant Dropdown/Menu)

1. Use a controlled dropdown open state to avoid ambiguous close behavior.
    1. `AppHeaderMenu` owns `isMenuOpen` state.
    2. Dropdown `onOpenChange` is the single source of truth for open/close transitions.
2. Menu action behavior:
    1. `Settings`: close menu, then navigate.
    2. `Toggle theme`: toggle mode and close menu.
    3. `Log out`: close menu, trigger logout mutation.
3. Close ordering:
    1. close menu state first
    2. then perform action/navigation
    3. restore focus to trigger after close
4. Settings must use link semantics:
    1. render Settings menu entry with `Link` (`to="/app/settings"`, `search={defaultSettingsSearch}`) for proper semantics/prefetch behavior.
5. Use menu-action-only composition (no embedded form controls/switch inside menu items).
6. Ensure `Esc` closes menu and returns focus to trigger.

## Component Design

1. Create shared component:
    1. `frontend/src/components/app-header-menu/AppHeaderMenu.tsx`
    2. `frontend/src/components/app-header-menu/app-header-menu.module.scss`
    3. `frontend/src/components/app-header-menu/types/app-header-menu.types.ts`
    4. `frontend/src/components/app-header-menu/AppHeaderMenu.test.tsx`
2. Component props:
    1. `userName?: string`
    2. no callback-only settings navigation prop; use route `Link` for Settings item
    3. `isDarkMode: boolean`
    4. `onToggleTheme: () => void`
    5. `onLogout: () => void`
    6. `isLogoutPending?: boolean`
3. Use Ant `Dropdown` + `Menu` as base.
4. Keep menu styles token-driven and scoped via CSS modules.

## AppLayout Integration

1. Update `PricePulseLogo` usage to navigate home.
    1. Keep `PricePulseLogo` presentational; wrap with TanStack `Link` in `AppLayout` (`to="/app"`, `search={defaultDashboardHomeSearch}`).
2. Remove inline `<nav>` links for Home/Runs/Settings.
3. Replace right-side action cluster with `AppHeaderMenu`.
4. Keep existing logout mutation and notification behavior.
5. Reuse existing theme context (`useAppTheme`) in `AppLayout`; do not introduce a parallel theme state.
6. Keep username visible either:
    1. inside menu header row (preferred), or
    2. next to trigger if desired by product.

## Files to Change

1. Create:
    1. `frontend/src/components/app-header-menu/AppHeaderMenu.tsx`
    2. `frontend/src/components/app-header-menu/app-header-menu.module.scss`
    3. `frontend/src/components/app-header-menu/types/app-header-menu.types.ts`
    4. `frontend/src/components/app-header-menu/AppHeaderMenu.test.tsx`
2. Update:
    1. `frontend/src/routes/app-layout.tsx`
    2. `frontend/src/routes/app-layout.module.scss`
    3. keep `frontend/src/components/price-pulse-logo/PricePulseLogo.tsx` presentational only (no router coupling)
    4. `frontend/src/routes/auth-routing.test.tsx` (header assertions)
    5. any existing header-related tests impacted

## Testing Plan

1. Unit (`AppHeaderMenu.test.tsx`):
    1. renders trigger and opens menu
    2. settings item renders link semantics and navigates
    3. `Toggle theme` action invokes callback and renders state-aware label/icon
    4. logout invokes callback
    5. logout disabled/loading when pending
    6. icons render for all menu rows
    7. keyboard navigation and escape close behavior
    8. outside click closes menu (portal rendering behavior)
    9. focus returns to trigger after `Esc` and after menu item action
2. Integration (`auth-routing.test.tsx` / layout tests):
    1. no inline Home/Runs/Settings links
    2. logo navigates to dashboard home with `defaultDashboardHomeSearch`
    3. settings menu action navigates with `defaultSettingsSearch`
    4. menu contains settings/toggle-theme/logout
    5. logout failure notification path still works
    6. menu closes after each action
3. Accessibility:
    1. check trigger/menu roles and labels
    2. focus restore on close

## Verification Commands

1. `npm run typecheck --workspace=frontend`
2. `npm run lint --workspace=frontend`
3. `npm run test --workspace=frontend`
4. `npm run build --workspace=frontend`

## Acceptance Criteria

1. Header is visually simplified (no inline Home/Runs/Settings links).
2. Logo is a working home link.
3. Menu provides Settings, `Toggle theme`, and logout with contextual icons.
4. Keyboard/screen-reader interaction is accessible and predictable.
5. Existing logout/session feedback still behaves correctly.
6. Frontend checks pass.

## Risks and Mitigations

1. Risk: hidden discoverability after removing inline links.
    - Mitigation: keep strong dashboard CTA links and clear menu label/icon.
2. Risk: menu accessibility regressions.
    - Mitigation: explicit keyboard/focus tests and ARIA assertions.
3. Risk: accidental nav regression in layout.
    - Mitigation: route-level integration tests for header behavior.
