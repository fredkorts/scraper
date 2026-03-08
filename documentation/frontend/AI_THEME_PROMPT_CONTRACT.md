# AI Theme Prompt Contract

## Status

Ready to use.

## Purpose

Use this contract when asking another AI to generate a new light/dark color theme for this project.

The output must fit the current token system and Ant Design integration without changing component code.

## Source of Truth Tokens

The AI must provide values for exactly these CSS variables:

1. `--color-page`
2. `--color-surface`
3. `--color-border`
4. `--color-border-muted`
5. `--color-text`
6. `--color-text-muted`
7. `--color-primary`
8. `--color-primary-contrast`
9. `--color-text-on-solid`
10. `--color-success`
11. `--color-warning`
12. `--color-info`
13. `--color-danger`
14. `--color-danger-text`
15. `--shadow-sm`
16. `--shadow-md`
17. `--shadow-lg`

The same set is required for both `light` and `dark`.

## Hard Constraints

1. Return only valid JSON.
2. Use only hex colors for `--color-*` values.
3. Use only `rgba(...)` for `--shadow-*` values.
4. Keep semantic intent:
    - `page` = app background
    - `surface` = cards/panels
    - `text` = primary readable text
    - `text-muted` = secondary readable text
    - `primary/success/warning/info/danger` = action/status colors
    - `text-on-solid` = text/icon color used on solid colored buttons/chips
5. Accessibility minimums:
    - `--color-text` on `--color-page`: 4.5:1 or better
    - `--color-text` on `--color-surface`: 4.5:1 or better
    - `--color-text-muted` on `--color-page`: 3.0:1 or better
    - `--color-text-on-solid` on each of:
        - `--color-primary`
        - `--color-success`
        - `--color-warning`
        - `--color-info`
        - `--color-danger`
          must be 4.5:1 or better
6. Avoid extreme low-contrast borders:
    - `--color-border` must be visibly distinct from both `--color-page` and `--color-surface`.

## Output Format (Required)

```json
{
    "themeName": "string",
    "light": {
        "--color-page": "#000000",
        "--color-surface": "#000000",
        "--color-border": "#000000",
        "--color-border-muted": "#000000",
        "--color-text": "#000000",
        "--color-text-muted": "#000000",
        "--color-primary": "#000000",
        "--color-primary-contrast": "#000000",
        "--color-text-on-solid": "#000000",
        "--color-success": "#000000",
        "--color-warning": "#000000",
        "--color-info": "#000000",
        "--color-danger": "#000000",
        "--color-danger-text": "#000000",
        "--shadow-sm": "0 2px 8px rgba(0, 0, 0, 0.12)",
        "--shadow-md": "0 10px 24px rgba(0, 0, 0, 0.16)",
        "--shadow-lg": "0 18px 36px rgba(0, 0, 0, 0.2)"
    },
    "dark": {
        "--color-page": "#000000",
        "--color-surface": "#000000",
        "--color-border": "#000000",
        "--color-border-muted": "#000000",
        "--color-text": "#000000",
        "--color-text-muted": "#000000",
        "--color-primary": "#000000",
        "--color-primary-contrast": "#000000",
        "--color-text-on-solid": "#000000",
        "--color-success": "#000000",
        "--color-warning": "#000000",
        "--color-info": "#000000",
        "--color-danger": "#000000",
        "--color-danger-text": "#000000",
        "--shadow-sm": "0 4px 10px rgba(0, 0, 0, 0.24)",
        "--shadow-md": "0 10px 24px rgba(0, 0, 0, 0.4)",
        "--shadow-lg": "0 20px 40px rgba(0, 0, 0, 0.5)"
    }
}
```

## Copy-Paste Prompt for External AI

```text
Generate one complete light and dark UI color theme for a React + Ant Design app.

You must return JSON only, following this exact schema and keys:
{
  "themeName": "string",
  "light": { ...exact token keys... },
  "dark": { ...exact token keys... }
}

Token keys required in both light and dark:
--color-page
--color-surface
--color-border
--color-border-muted
--color-text
--color-text-muted
--color-primary
--color-primary-contrast
--color-text-on-solid
--color-success
--color-warning
--color-info
--color-danger
--color-danger-text
--shadow-sm
--shadow-md
--shadow-lg

Hard rules:
1) Hex colors only for --color-* values.
2) rgba(...) only for --shadow-* values.
3) Keep semantic meaning of tokens.
4) Accessibility:
   - color-text on color-page >= 4.5:1
   - color-text on color-surface >= 4.5:1
   - color-text-muted on color-page >= 3.0:1
   - color-text-on-solid on primary/success/warning/info/danger >= 4.5:1
5) Borders must be visibly distinct from page and surface.
6) Do not include explanations, markdown, or extra fields.
```

## How This Maps to Ant Theme Tokens

These app tokens are already mapped in code:

- `colorPrimary <- --color-primary`
- `colorBgLayout <- --color-page`
- `colorBgContainer <- --color-surface`
- `colorBgElevated <- --color-surface`
- `colorBorder <- --color-border`
- `colorText <- --color-text`
- `colorTextSecondary <- --color-text-muted`
- `colorSuccess <- --color-success`
- `colorWarning <- --color-warning`
- `colorInfo <- --color-info`
- `colorError <- --color-danger`

No extra AI output is needed for Ant-specific keys.

## Apply Checklist

1. Replace token values in:
    - `frontend/src/styles/abstracts/_variables.scss`
2. Run:
    - `npm run lint --workspace=frontend`
    - `npm run test --workspace=frontend`
    - `npm run build --workspace=frontend`
3. Spot-check key screens:
    - `/app`
    - `/app/runs`
    - `/app/settings`
    - product detail page
4. Verify dark mode contrast manually for:
    - breadcrumb text
    - card labels
    - chart axis text
    - primary/success/danger button text
