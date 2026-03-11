# Frontend Structure Guidelines

## Status

Active. Applies to all new frontend changes.

## Folder Conventions

1. Keep feature code under `frontend/src/features/<feature>/`.
2. Route files under `frontend/src/routes/` should be thin composition entries.
3. Feature route UIs belong in `features/<feature>/views/<view-name>/`.
4. A view folder may contain:
    1. `<ViewName>.tsx`
    2. `<view-name>.module.scss` (only when needed)
    3. `components/` (only for view-specific child components)
    4. `hooks/` (only for view-local hooks)
    5. `types/` (only for view-local types)
    6. `index.ts` (public export for the view)
5. Each feature with views should expose `features/<feature>/views/index.ts` as a barrel.

## Import Boundary Rules

1. Route page files (`src/routes/*-page.tsx`) must import from feature view barrels only:
    1. Allowed: `../features/<feature>/views`
    2. Not allowed: deep imports like `../features/<feature>/views/<view-name>`
    3. Not allowed: direct `components`, `hooks`, `queries`, `mutations`, `constants`, `utils`, `schemas` imports from routes
2. Keep cross-feature imports explicit and minimal.
3. Prefer feature barrel exports when crossing boundaries.
4. Avoid adding new route-level logic if it belongs in a feature view/hook.
5. Feature-internal files should avoid cross-feature deep relative imports.
6. Prefer feature public export surfaces (barrels) for cross-feature usage.

## Container vs Presentational

### Container Components

1. Own server-state orchestration (TanStack Query).
2. Own URL/search-state synchronization (TanStack Router).
3. Own mutation flow and side-effects (notifications, navigation).
4. Pass stable, typed props into presentational children.

### Presentational Components

1. Focus on rendering and UI interactions.
2. Receive data and callbacks via props.
3. Avoid direct API/query concerns unless the component is explicitly a container.

## Naming Standards

1. View folders: `kebab-case` (`run-detail-page`).
2. View components: `PascalCase` with `View` suffix (`RunDetailPageView.tsx`).
3. Hook files: `use-<name>.ts` or `use-<name>.tsx`.
4. CSS Modules: `<scope>.module.scss`.
5. Export surfaces:
    1. `index.ts` at view folder level
    2. `views/index.ts` at feature level when multiple views exist
    3. add feature-level `index.ts` exports as needed to support clean cross-feature imports

## Lint Guardrails

1. `src/routes/*-page.tsx` has strict route-boundary import rules (error).
2. `src/features/**/*.{ts,tsx}` has cross-feature deep-import detection (warning initially).
3. Promotion path:
    1. clean warning backlog by introducing feature public barrels
    2. update imports to those barrels
    3. raise warning rule to error once clean

## Reviewer Checklist

1. Route file remains thin and only composes a feature view.
2. No route-level business/query logic was added.
3. Feature view and imports follow folder conventions.
4. No new deep cross-feature imports were introduced without reason.
5. Frontend verification passes:
    1. `npm run lint --workspace=frontend`
    2. `npm run test --workspace=frontend`
    3. `npm run build --workspace=frontend`
