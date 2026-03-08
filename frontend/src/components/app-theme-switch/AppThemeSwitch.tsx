import { MoonFilled, SunFilled } from "@ant-design/icons";
import { Switch } from "antd";
import type { AppThemeSwitchProps } from "./types/app-theme-switch.types";
import styles from "./app-theme-switch.module.scss";

export const AppThemeSwitch = ({
    isDarkMode,
    disabled = false,
    ariaLabel = "Toggle dark mode",
    onToggle,
}: AppThemeSwitchProps) => (
    <Switch
        aria-label={ariaLabel}
        checked={isDarkMode}
        checkedChildren={<MoonFilled aria-hidden="true" />}
        className={styles.switch}
        disabled={disabled}
        unCheckedChildren={<SunFilled aria-hidden="true" />}
        onChange={(checked) => onToggle(checked)}
    />
);
