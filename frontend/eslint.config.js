import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

const featureNames = ["auth", "categories", "products", "public", "runs", "settings"];
const relativeParentPrefixes = ["../", "../../", "../../../", "../../../../", "../../../../../", "../../../../../../"];
const crossFeatureDeepImportPatterns = featureNames.flatMap((featureName) =>
    relativeParentPrefixes.map((prefix) => `${prefix}${featureName}/**`),
);

export default defineConfig([
    globalIgnores(["dist"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
    },
    {
        files: ["src/routes/*-page.tsx"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["../features/*/views/*"],
                            message:
                                "Route page files must import from feature view barrels: ../features/<feature>/views.",
                        },
                        {
                            group: [
                                "../features/*/components/*",
                                "../features/*/hooks/*",
                                "../features/*/queries",
                                "../features/*/queries/*",
                                "../features/*/mutations",
                                "../features/*/mutations/*",
                                "../features/*/constants/*",
                                "../features/*/utils/*",
                                "../features/*/schemas",
                                "../features/*/schemas/*",
                            ],
                            message:
                                "Route page files must stay thin. Move route logic into feature views and import only from ../features/<feature>/views.",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/features/**/*.{ts,tsx}"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: crossFeatureDeepImportPatterns,
                            message:
                                "Avoid cross-feature deep imports. Prefer feature public export surfaces (barrels) when crossing feature boundaries.",
                        },
                    ],
                },
            ],
        },
    },
]);
