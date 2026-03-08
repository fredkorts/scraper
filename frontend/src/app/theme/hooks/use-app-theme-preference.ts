import { useCallback, useEffect, useMemo, useState } from "react";
import { readAppColorTokens } from "../theme-token-reader";
import {
    applyThemeToDocument,
    clearStoredThemePreference,
    readStoredThemePreference,
    readSystemPrefersDark,
    resolveIsDarkMode,
    writeThemePreference,
} from "../theme-preference";
import type { AppThemeState, ThemePreference } from "../types/theme.types";

export const useAppThemePreference = () => {
    const [themePreference, setThemePreference] = useState<ThemePreference>(() => readStoredThemePreference());
    const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => readSystemPrefersDark());

    const isDarkMode = useMemo(
        () => resolveIsDarkMode(themePreference, systemPrefersDark),
        [themePreference, systemPrefersDark],
    );
    const tokens = readAppColorTokens();

    useEffect(() => {
        applyThemeToDocument(isDarkMode);
    }, [isDarkMode]);

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return undefined;
        }

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const listener = () => {
            if (themePreference === null) {
                applyThemeToDocument(mediaQuery.matches);
            }

            setSystemPrefersDark(mediaQuery.matches);
        };

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", listener);

            return () => {
                mediaQuery.removeEventListener("change", listener);
            };
        }

        mediaQuery.addListener?.(listener);

        return () => {
            mediaQuery.removeListener?.(listener);
        };
    }, [themePreference]);

    const setDarkMode = useCallback((nextIsDarkMode: boolean) => {
        const nextPreference: Exclude<ThemePreference, null> = nextIsDarkMode ? "dark" : "light";
        applyThemeToDocument(nextIsDarkMode);
        setThemePreference(nextPreference);
        writeThemePreference(nextPreference);
    }, []);

    const clearThemePreference = useCallback(() => {
        applyThemeToDocument(systemPrefersDark);
        setThemePreference(null);
        clearStoredThemePreference();
    }, [systemPrefersDark]);

    const themeState = useMemo<AppThemeState>(
        () => ({
            isDarkMode,
            themePreference,
            tokens,
        }),
        [isDarkMode, themePreference, tokens],
    );

    return {
        ...themeState,
        setDarkMode,
        clearThemePreference,
    };
};
