import { ConfigProvider, theme as antdTheme } from "antd";
import type { ThemeConfig } from "antd";
import { useMemo } from "react";
import { useSystemTheme } from "./theme/use-system-theme";
import type { AppThemeProviderProps } from "./theme/types/theme.types";

export const AppThemeProvider = ({ children }: AppThemeProviderProps) => {
    const themeState = useSystemTheme();

    const themeConfig = useMemo<ThemeConfig>(
        () => ({
            algorithm: themeState.isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
            token: {
                colorPrimary: themeState.tokens.colorPrimary,
                colorBgLayout: themeState.tokens.colorBgLayout,
                colorBgBase: themeState.tokens.colorBgLayout,
                colorBgContainer: themeState.tokens.colorBgContainer,
                colorBgElevated: themeState.tokens.colorBgElevated,
                colorBorder: themeState.tokens.colorBorder,
                colorText: themeState.tokens.colorText,
                colorTextSecondary: themeState.tokens.colorTextSecondary,
                colorTextTertiary: themeState.tokens.colorTextSecondary,
                colorTextHeading: themeState.tokens.colorText,
                colorSuccess: themeState.tokens.colorSuccess,
                colorWarning: themeState.tokens.colorWarning,
                colorInfo: themeState.tokens.colorInfo,
                colorError: themeState.tokens.colorError,
                fontFamily: "var(--font-family-base)",
            },
            components: {
                Breadcrumb: {
                    itemColor: themeState.tokens.colorTextSecondary,
                    linkColor: themeState.tokens.colorTextSecondary,
                    separatorColor: themeState.tokens.colorTextSecondary,
                    lastItemColor: themeState.tokens.colorText,
                },
                Card: {
                    colorBgContainer: themeState.tokens.colorBgContainer,
                },
                Descriptions: {
                    labelColor: themeState.tokens.colorTextSecondary,
                },
                Select: {
                    optionSelectedBg: themeState.tokens.colorBgLayout,
                },
                Segmented: {
                    trackBg: themeState.tokens.colorBgLayout,
                },
            },
        }),
        [themeState],
    );

    return (
        <ConfigProvider theme={themeConfig}>
            {children}
        </ConfigProvider>
    );
};
