import type { ReactNode } from "react";

export interface AppThemeProviderProps {
    children: ReactNode;
}

export interface AppColorTokens {
    colorPrimary: string;
    colorBgLayout: string;
    colorBgContainer: string;
    colorBgElevated: string;
    colorBorder: string;
    colorText: string;
    colorTextSecondary: string;
    colorSuccess: string;
    colorWarning: string;
    colorInfo: string;
    colorError: string;
}

export interface AppThemeState {
    isDarkMode: boolean;
    tokens: AppColorTokens;
}
