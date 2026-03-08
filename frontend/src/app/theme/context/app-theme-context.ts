import { createContext, useContext } from "react";
import type { AppThemeContextValue } from "../types/theme.types";

const missingProvider = (): never => {
    throw new Error("useAppTheme must be used within <AppThemeProvider />");
};

export const AppThemeContext = createContext<AppThemeContextValue>({
    isDarkMode: false,
    themePreference: null,
    setDarkMode: missingProvider,
    clearThemePreference: missingProvider,
});

export const useAppTheme = () => useContext(AppThemeContext);
