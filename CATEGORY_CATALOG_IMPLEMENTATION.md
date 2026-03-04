# Category Catalog Implementation Plan

## Status

Implemented on March 4, 2026.

Delivered:

- category responses now include hierarchy metadata:
  - `depth`
  - `pathNameEt`
  - `pathNameEn`
- settings, dashboard, and runs selectors now render hierarchy-aware category labels
- added a live category catalog refresh command:
  - dry-run by default
  - `--apply` to persist changes
- live Mabrik catalog applied to the development database

Not implemented:

- admin API endpoint for catalog refresh

## Summary

The current category system is too static and too flat for the way Mabrik organizes its catalog.

Right now:

- the seeded catalog is based on a short hardcoded list in [shared/src/index.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/shared/src/index.ts)
- only a small subset of real Mabrik subcategories exists in the database
- frontend selects render categories as a flat list

This causes two product problems:

1. users cannot track many real subcategories they care about
2. dropdowns are not structured in a way that matches the site’s category hierarchy

The correct fix is to turn categories into a maintained hierarchical catalog and display them in a logical tree-aware way across the app.

## Goals

1. Build a complete and refreshable Mabrik category catalog, including subcategories.
2. Store category hierarchy explicitly in PostgreSQL using `parentId`.
3. Expose category data in a consistent structure that supports logical UI rendering.
4. Render dropdowns and category selectors in a hierarchy-aware way.
5. Keep the catalog maintainable as Mabrik adds, removes, or renames categories.

## Non-Goals

1. Replacing the existing category table design.
2. Building a full category management CMS.
3. Supporting arbitrary multi-parent category graphs.
4. Reworking product-category semantics beyond the category catalog problem.

## Current State

### Source of truth

The current source is [shared/src/index.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/shared/src/index.ts):

- `MABRIK_CATEGORIES`

That list is static and incomplete.

### Persistence

Categories are persisted through [backend/prisma/seed.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/prisma/seed.ts):

- creates categories by slug
- derives `parentId` from slash-separated slugs

That is structurally sound, but only as good as the source list.

### API shape

[backend/src/services/categories.service.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/services/categories.service.ts) returns a flat array:

- sorted by `nameEt`
- includes `parentId`

The frontend currently renders these categories as plain flat options.

## Product Decision

The category catalog must become dynamic and refreshable from Mabrik’s real category structure.

That means:

1. hardcoded categories become bootstrap/fallback data only
2. the database becomes the canonical runtime source of category data
3. category hierarchy is persisted and returned in a UI-friendly structure

Additional decisions:

4. category discovery must use one canonical source strategy, not ad hoc scraping from whichever surface happens to work
5. refresh must be safe by default and resist accidental mass deactivation caused by parser/source breakage
6. inactive categories must remain historically visible but excluded from new active selection flows

## Recommended Architecture

### 1. Source Strategy

Use a two-layer model:

1. bootstrap source:
   - existing `MABRIK_CATEGORIES`
   - used only for initial local setup or fallback

2. dynamic catalog refresh:
   - scraper-driven category discovery from Mabrik
   - updates the DB catalog

Recommendation:

- keep `MABRIK_CATEGORIES` temporarily for local bootstrap and resilience
- introduce a category-catalog refresh job as the real long-term source

### Canonical discovery source

This plan needs one explicit source priority so refresh behavior is deterministic.

Recommended source order:

1. primary source:
   - Mabrik category navigation or category landing structure, if it exposes the full hierarchy

2. fallback source:
   - direct category URL discovery from known category listing paths only if the primary source is incomplete or unavailable

3. bootstrap fallback:
   - `MABRIK_CATEGORIES` only for local bootstrap or temporary resilience

Rule:

- do not merge arbitrary sources opportunistically without normalization rules
- the refresh service must define exactly which source supplies:
  - slug
  - display labels
  - parent relationship
  - sibling order

If the primary source does not expose a complete hierarchy, the refresh should fail safely or run in dry-run mode instead of applying uncertain category deletions.

### 2. Canonical Database Model

Use the existing `categories` table as the canonical source of truth.

Required fields already present:

- `id`
- `slug`
- `nameEt`
- `nameEn`
- `parentId`
- `isActive`
- `scrapeIntervalHours`

Potential additional fields worth adding:

- `depth`
- `sortOrder`
- `pathNameEt`
- `pathNameEn`
- `lastCatalogSyncAt`

Recommendation:

- do not add all of them immediately
- add only the smallest useful metadata that improves UI and refresh behavior

Smallest useful upgrade:

- `depth`

Why:

- makes ordering and indentation straightforward
- avoids recomputing hierarchy depth repeatedly in multiple places

Optional but useful later:

- `pathNameEt` for search/display labels like `Lauamängud / Strateegia`
- `sortOrder` for stable sibling ordering when source order is available

### Slug normalization rules

Slug handling must be explicit because slug is the unique key.

Required normalization:

1. store slugs relative to `/tootekategooria/`
2. lowercase before persistence
3. strip leading and trailing slashes
4. URL-decode path segments before persistence
5. collapse duplicate slash boundaries

Required conflict rule:

- if two discovered entries normalize to the same slug, treat that as a refresh error and do not silently create duplicates

Slug changes on Mabrik:

- if Mabrik renames a slug, treat it as a new category until explicit aliasing/migration logic is introduced
- do not guess slug continuity automatically in the first implementation

## Catalog Refresh Design

### Core rule

Do not maintain the real category tree by hand.

Instead:

1. fetch or scrape the Mabrik category navigation/catalog source
2. normalize category records
3. upsert into the DB by slug
4. update hierarchy via `parentId`
5. mark missing categories inactive rather than deleting them

### Why inactive instead of delete

Deleting categories is risky because:

- historical subscriptions may reference them
- old runs/products/history may still point to them
- a temporary fetch failure could erase valid categories

So the correct rule is:

- missing from latest catalog sync -> `isActive = false`

### Inactive category behavior

Deactivation must not make historical data disappear.

Required rules:

1. inactive categories remain queryable for historical runs, products, and subscriptions that already reference them
2. inactive categories are excluded from new active selection lists
3. inactive categories should remain visible in existing user subscriptions until explicitly removed
4. inactive categories should not count toward new category discovery, but product needs one explicit subscription-limit rule

Recommended rule for limits:

- inactive subscriptions continue to display but do not count toward the active free/paid tracking limit if the category is no longer selectable

This must be implemented intentionally; otherwise deactivation can silently block users from tracking new active categories.

### Refresh triggers

Recommended options:

1. manual admin refresh
2. optional scheduled refresh

Recommendation for first implementation:

- admin-only manual catalog refresh

Why:

- easier to verify
- lower risk
- enough for current project phase

### Refresh endpoint / command

Possible first interfaces:

1. CLI:
   - `npm run categories:refresh --workspace=backend`

2. Admin API:
   - `POST /api/categories/refresh`

Recommendation:

- implement CLI first
- optionally expose admin API after backend logic is verified

The CLI path is lower-risk and easier to debug.

### Refresh safety guardrails

Refresh must not apply destructive changes blindly.

Required safety rules:

1. first implementation supports dry-run mode
2. refresh output must summarize:
   - created
   - updated
   - reparented
   - deactivated
3. if the refresh attempts to deactivate an unexpectedly large portion of the catalog, abort instead of applying automatically

Recommended threshold:

- abort if more than a configured percentage of currently active categories would be deactivated in one refresh

This protects the catalog from parser failure or upstream structure changes.

## Hierarchy Rules

### Category identity

Use `slug` as the stable unique key.

### Parent detection

Preferred order:

1. if parent is discoverable from the source navigation, use that
2. if not, derive from slug path segments as a fallback

Example:

- `lauamangud/strateegia` -> parent slug `lauamangud`

This fallback is acceptable because the current seeding already uses that pattern.

### Tree constraints

1. one category has at most one parent
2. top-level categories have `parentId = null`
3. no cycles
4. inactive parents should not break child persistence

### Ordering

Do not sort category selectors alphabetically across the entire flat list.

That destroys the hierarchy.

Recommended order:

1. top-level categories in source order or stable name order
2. children grouped immediately after their parent
3. siblings sorted consistently by source order if available, otherwise `nameEt`

For a first useful version:

- sort by hierarchy path, then `nameEt`

Long-term rule:

- if source order is discoverable, persist or derive a stable sibling order instead of relying permanently on lexical name order

The plan should treat `sortOrder` as a likely near-term need, not just an optional afterthought.

## API Design

### Current issue

Returning a flat unspecialized list forces every frontend consumer to rediscover the tree.

### Recommended response shape

Keep the API flat, but make it hierarchy-aware:

```ts
interface CategoryListItem {
  id: string;
  slug: string;
  nameEt: string;
  nameEn: string;
  parentId?: string;
  depth: number;
  isActive: boolean;
  scrapeIntervalHours: 6 | 12 | 24 | 48;
}
```

Optional later:

```ts
pathNameEt?: string;
pathNameEn?: string;
```

Why flat is still preferred:

- easier for forms and filters
- easier to cache
- easier to reuse across settings, admin, dashboard filters, and scraper trigger controls

The UI can derive either:

- indented labels
- grouped lists
- breadcrumb labels

from the same shape.

### Additional endpoint option

If future needs grow, add:

- `GET /api/categories/tree`

But do not start there unless necessary.

The flat-with-depth model is enough for current requirements.

## Frontend Display Strategy

### Goal

Dropdowns should reflect hierarchy clearly without becoming hard to scan.

### Recommended rendering modes

#### Native `<select>` version

Use flat options with hierarchy-aware labels:

- `Lauamängud`
- `  Strateegia`
- `  Seltskond`
- `  Pusled`

or:

- `Lauamängud / Strateegia`

Recommendation:

- use breadcrumb labels for compactness and clarity:
  - `Lauamängud / Strateegia`
  - `Lauamängud / Seltskond`

Why:

- works better in native selects
- screen readers read it more clearly than visual indentation alone
- avoids inconsistent spacing hacks

### Admin selectors

Admin category selectors should show full paths too:

- especially for interval management
- especially for manual scrape trigger

### Tracking selectors

Tracking selectors should prioritize leaf and meaningful subcategories, not just parents.

Potential future refinement:

- show parents and children
- optionally discourage subscribing to very broad top-level categories if that becomes operationally noisy

That should be decided earlier than full rollout because it affects backend subscription semantics.

Recommended default rule:

- keep both parent and child categories selectable in the first implementation
- use the same hierarchy-aware labels so the distinction is obvious
- revisit leaf-only subscription policy only if operational noise becomes a real issue

## Recommended UX Rules

1. Show full category paths in selects.
2. Keep top-level categories selectable unless product explicitly decides otherwise.
3. Do not hide subcategories behind a second dependent dropdown unless the catalog becomes too large for one selector.
4. Preserve keyboard accessibility with native form controls where possible.
5. Avoid ambiguous duplicate names by always including path context.

## Data Flow Recommendation

### Backend

1. refresh or seed categories into DB
2. compute `parentId`
3. compute `depth`
4. return categories in hierarchy-aware order

### Frontend

1. fetch categories once with TanStack Query
2. derive `displayLabel`
3. reuse the same formatted category options across:
   - settings tracking tab
   - settings admin tab
   - dashboard filters
   - runs filters

Recommendation:

- create a shared frontend category formatting helper instead of repeating label logic in multiple routes

## Implementation Phases

### Phase 1: Category formatting and display cleanup

Goal:

- improve category selects even before full dynamic refresh exists

Work:

1. use existing `parentId` data
2. build a frontend category tree/path formatter
3. render path-aware labels in:
   - settings tracking select
   - settings admin select
   - dashboard category filter
   - runs category filter

This is the smallest immediately visible improvement.

### Phase 2: Backend hierarchy metadata

Goal:

- make hierarchy rendering systematic

Work:

1. add `depth` calculation
2. return categories in hierarchy-aware order
3. update shared/frontend schemas

### Phase 3: Dynamic category catalog refresh

Goal:

- stop relying on a hand-maintained category list

Work:

1. implement category discovery logic
2. upsert all discovered categories
3. deactivate missing categories
4. add admin CLI or admin endpoint to refresh catalog

### Phase 4: Optional product refinements

Goal:

- improve how broad vs narrow categories are used operationally

Possible future work:

1. recommend leaf categories in tracking UI
2. flag top-level categories as broad/high-volume
3. add category search

## Backend Changes Required

### First slice

1. add a service utility to:
   - build category tree metadata
   - compute `depth`
   - generate hierarchy order

2. update [backend/src/services/categories.service.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/services/categories.service.ts)
   - return ordered categories
   - include `depth`

3. update shared types in [shared/src/index.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/shared/src/index.ts)

### Later slice

4. implement category refresh command/service
5. optionally add admin refresh API

## Frontend Changes Required

1. add category formatting helper in `frontend/src/features/categories`
2. format category options as path labels
3. reuse across:
   - settings page
   - dashboard home
   - runs page

Potential helper shape:

```ts
interface CategoryOption {
  id: string;
  label: string;
  depth: number;
  slug: string;
}
```

## Testing Plan

### Backend tests

1. hierarchy ordering is stable
2. `depth` is correct for top-level and nested categories
3. missing parent references are handled safely
4. inactive categories are excluded from active selectors
5. category refresh upserts existing rows by slug
6. refresh marks missing categories inactive instead of deleting them
7. slug normalization prevents duplicate categories from alternate URL forms
8. refresh aborts safely when deactivation volume exceeds threshold
9. inactive subscribed categories remain historically visible

### Frontend tests

1. settings tracking select shows hierarchy-aware labels
2. admin category select shows hierarchy-aware labels
3. dashboard category filter uses the same formatting helper
4. runs category filter uses the same formatting helper
5. duplicate child names under different parents remain distinguishable

## Risks and Design Pitfalls

1. scraping category navigation may be brittle if Mabrik changes its menu structure
2. mixing hand-maintained and discovered categories can create duplicates if slug normalization is inconsistent
3. alphabetic global sorting can accidentally flatten the hierarchy again
4. deleting categories instead of deactivating them would break history and subscriptions
5. ambiguous source authority can make refresh nondeterministic
6. broad parent-category subscriptions may create noisy operational behavior if not monitored

## Acceptance Criteria

This work is complete when:

1. category selectors show subcategories in a logical hierarchy-aware way
2. category labels are unambiguous and reusable across the UI
3. backend category responses include enough metadata for hierarchy rendering
4. the category catalog can be refreshed without manual hardcoded edits
5. missing categories are deactivated, not deleted
6. refresh has a dry-run path and a large-change safety guard
7. inactive categories remain historically visible without breaking user flows

## Recommended First Implementation Slice

Do this first:

1. backend category ordering + `depth`
2. frontend path-label formatter
3. update all current category selects/filters

Then do:

4. dynamic category catalog refresh

That order gives an immediate UX improvement while building toward the correct long-term source-of-truth model.
