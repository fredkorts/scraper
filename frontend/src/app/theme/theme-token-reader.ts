import type { AppColorTokens, AppThemeState } from "./types/theme.types";

const FALLBACK_COLOR_TOKENS: AppColorTokens = {
    colorPrimary: "var(--color-primary)",
    colorBgLayout: "var(--color-page)",
    colorBgContainer: "var(--color-surface)",
    colorBgElevated: "var(--color-surface)",
    colorBorder: "var(--color-border)",
    colorText: "var(--color-text)",
    colorTextSecondary: "var(--color-text-muted)",
    colorSuccess: "var(--color-success)",
    colorWarning: "var(--color-warning)",
    colorInfo: "var(--color-info)",
    colorError: "var(--color-danger)",
};

const readIsDarkMode = (): boolean => {
    if (typeof window === "undefined") {
        return false;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const readCssVar = (styles: CSSStyleDeclaration, cssVariableName: string, fallback: string): string => {
    const value = styles.getPropertyValue(cssVariableName).trim();
    return value.length > 0 ? value : fallback;
};

const readAppColorTokens = (): AppColorTokens => {
    if (typeof window === "undefined") {
        return FALLBACK_COLOR_TOKENS;
    }

    const styles = getComputedStyle(document.documentElement);

    return {
        colorPrimary: readCssVar(styles, "--color-primary", FALLBACK_COLOR_TOKENS.colorPrimary),
        colorBgLayout: readCssVar(styles, "--color-page", FALLBACK_COLOR_TOKENS.colorBgLayout),
        colorBgContainer: readCssVar(styles, "--color-surface", FALLBACK_COLOR_TOKENS.colorBgContainer),
        colorBgElevated: readCssVar(styles, "--color-surface", FALLBACK_COLOR_TOKENS.colorBgElevated),
        colorBorder: readCssVar(styles, "--color-border", FALLBACK_COLOR_TOKENS.colorBorder),
        colorText: readCssVar(styles, "--color-text", FALLBACK_COLOR_TOKENS.colorText),
        colorTextSecondary: readCssVar(styles, "--color-text-muted", FALLBACK_COLOR_TOKENS.colorTextSecondary),
        colorSuccess: readCssVar(styles, "--color-success", FALLBACK_COLOR_TOKENS.colorSuccess),
        colorWarning: readCssVar(styles, "--color-warning", FALLBACK_COLOR_TOKENS.colorWarning),
        colorInfo: readCssVar(styles, "--color-info", FALLBACK_COLOR_TOKENS.colorInfo),
        colorError: readCssVar(styles, "--color-danger", FALLBACK_COLOR_TOKENS.colorError),
    };
};

export const readAppThemeState = (): AppThemeState => ({
    isDarkMode: readIsDarkMode(),
    tokens: readAppColorTokens(),
});
