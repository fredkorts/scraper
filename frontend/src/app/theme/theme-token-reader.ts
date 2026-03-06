import type { AppColorTokens, AppThemeState } from "./types/theme.types";

const FALLBACK_COLOR_TOKENS: AppColorTokens = {
    colorPrimary: "#0f4c81",
    colorBgLayout: "#f4f6f8",
    colorBgContainer: "#ffffff",
    colorBgElevated: "#ffffff",
    colorBorder: "#d6dce3",
    colorText: "#17202a",
    colorTextSecondary: "#536171",
    colorSuccess: "#1d6f42",
    colorWarning: "#9a6700",
    colorInfo: "#235d9f",
    colorError: "#b02a37",
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
