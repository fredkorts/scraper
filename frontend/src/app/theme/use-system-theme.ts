import { useEffect, useState } from "react";
import { readAppThemeState } from "./theme-token-reader";
import type { AppThemeState } from "./types/theme.types";

export const useSystemTheme = () => {
    const [themeState, setThemeState] = useState<AppThemeState>(() => readAppThemeState());

    useEffect(() => {
        const updateThemeState = () => {
            setThemeState(readAppThemeState());
        };

        updateThemeState();

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const listener = () => {
            updateThemeState();
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
    }, []);

    return themeState;
};
