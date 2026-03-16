# Account Basics Read-Only Fields Implementation

## Status

Planned (March 16, 2026).

## Summary

Refactor the `Account Basics` section in Settings into a clear form-style layout where most account attributes are displayed as read-only input fields. The only editable field remains `Name`.

## UX Goal

1. Present account data in one coherent form structure.
2. Make editability explicit through control state, not separate visual patterns.
3. Reduce ambiguity: users can see all core account values, but only `Name` is interactive.

## Scope

1. Include:

- `Account Basics` UI layout change in Settings.
- Read-only input rendering for non-editable account fields.
- Label/help-text updates to clarify editability.
- Test updates for the new structure.

2. Exclude:

- Backend/profile API changes.
- New editable fields.
- Changes to `Security` and `Active sessions` sections.

## Target Files

1. Account Basics UI:

- `frontend/src/features/settings/components/account-tab.tsx`
- `frontend/src/features/settings/components/settings-shared.module.scss`

2. Shared typings (if needed):

- `frontend/src/features/settings/types/settings-ui.types.ts`

3. Tests:

- `frontend/src/routes/settings-page.test.tsx`

## Data Model in Account Basics Form

1. Editable field:

- `Name` (`AppInput`, enabled, validated, submitted via existing profile form).

2. Read-only fields:

- `Email`
- `Role`
- `Account status`
- `Email verified`

## UI Structure Plan

1. Keep `Account Basics` wrapped in the existing form container.
2. Replace the current `metaGrid` display blocks with labeled `AppInput` fields using `readOnly`.
3. Add one section-level helper line under the heading:

- `Only Name can be edited right now. Other fields are read-only.`

4. Add one inline cue on `Name` label (or nearby helper text), for example:

- `Editable`

5. Keep save actions unchanged:

- `Save changes` submits only `Name`.
- `Resend verification email` remains available when email is unverified.

## Interaction and Accessibility Rules

1. Non-editable fields must be rendered as read-only controls (`readOnly`), not disabled controls.
2. Read-only fields remain selectable so users can copy values (especially email).
3. Only `Name` is mutable; other fields are read-only.
4. Labels remain explicit and associated with each field.
5. Error handling for `Name` stays unchanged.
6. Visual distinction is required:

- Editable field (`Name`) keeps normal surface + focus affordance.
- Read-only fields use a muted background and non-edit affordance.

## Test-First Implementation Plan

1. Update `settings-page` tests first:

- Assert Account Basics renders read-only inputs for `Email`, `Role`, `Account status`, `Email verified`.
- Assert `Name` input remains enabled.
- Assert section-level editability helper text is visible.
- Assert read-only fields are `readOnly` and not `disabled`.
- Assert profile save flow still updates `Name`.

2. Implement Account Basics UI refactor in `account-tab.tsx`.
3. Add/adjust minimal SCSS for consistent spacing/alignment of read-only fields.
4. Re-run tests and iterate.

## Test Cases

1. `renders account basics as form fields with only name editable`

- `Name` input is enabled.
- `Email`, `Role`, `Account status`, `Email verified` inputs are read-only.
- `Email` is `readOnly` and not `disabled` (copy-friendly).
- Section-level helper text about editability is present.

2. `updates profile name successfully`

- Existing name update flow remains green.

3. `shows resend verification action when unverified`

- Unverified state still exposes the resend button.

## Risks and Mitigations

1. Risk: Read-only and editable fields may look too similar.

- Mitigation: add explicit `Editable` cue on `Name` and keep section-level helper text.

2. Risk: Form feels cluttered on mobile.

- Mitigation: keep single-column stacking and existing spacing utilities.

3. Risk: Tests tied to previous non-input metadata layout fail.

- Mitigation: migrate assertions to label/input semantics instead of text blocks.

## Acceptance Criteria

1. Account Basics is presented as a form-like layout.
2. Only `Name` is editable.
3. `Email`, `Role`, `Account status`, and `Email verified` are shown as read-only input fields.
4. Save-name and resend-verification behavior remains intact.
5. Frontend lint, typecheck, and affected route tests pass.

## Verification Commands

1. `npm run lint --workspace=frontend`
2. `npm run typecheck --workspace=frontend`
3. `npm run test --workspace=frontend -- src/routes/settings-page.test.tsx`

## Implementation Checklist

1. Add/adjust tests for read-only account fields.
2. Refactor `Account Basics` JSX to input-based layout.
3. Keep only `Name` wired to `react-hook-form` editable state.
4. Ensure non-editable fields are `readOnly` and correctly labeled.
5. Ensure section-level helper text and `Name` editability cue are present.
6. Validate mobile and desktop spacing.
7. Run lint, typecheck, and settings route tests.
