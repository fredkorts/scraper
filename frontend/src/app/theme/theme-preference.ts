import type { ThemePreference } from "./types/theme.types";
import { APP_THEME_STORAGE_KEY } from "./constants/theme.constants";

const isThemePreference = (value: string): value is Exclude<ThemePreference, null> =>
    value === "light" || value === "dark";

export const readStoredThemePreference = (): ThemePreference => {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const value = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
        return value && isThemePreference(value) ? value : null;
    } catch {
        return null;
    }
};

export const writeThemePreference = (value: Exclude<ThemePreference, null>): void => {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.setItem(APP_THEME_STORAGE_KEY, value);
    } catch {
        // Ignore storage write failures and keep runtime state in memory.
    }
};

export const clearStoredThemePreference = (): void => {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.removeItem(APP_THEME_STORAGE_KEY);
    } catch {
        // Ignore storage removal failures and keep runtime state in memory.
    }
};

export const readSystemPrefersDark = (): boolean => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export const resolveIsDarkMode = (themePreference: ThemePreference, systemPrefersDark: boolean): boolean => {
    if (themePreference === "dark") {
        return true;
    }

    if (themePreference === "light") {
        return false;
    }

    return systemPrefersDark;
};

export const applyThemeToDocument = (isDarkMode: boolean): void => {
    if (typeof document === "undefined") {
        return;
    }

    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
};

export const bootstrapThemeBeforeRender = (): void => {
    const themePreference = readStoredThemePreference();
    const isDarkMode = resolveIsDarkMode(themePreference, readSystemPrefersDark());
    applyThemeToDocument(isDarkMode);
};
