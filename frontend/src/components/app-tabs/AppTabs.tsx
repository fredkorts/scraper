import { Tabs } from "antd";
import { APP_TABS_DEFAULT_SIZE, APP_TABS_DEFAULT_TYPE } from "./constants/app-tabs.constants";
import styles from "./AppTabs.module.scss";
import type { AppTabsProps } from "./types/app-tabs.types";

export const AppTabs = <T extends string>({
    items,
    activeKey,
    onChange,
    ariaLabel,
    className,
    size = APP_TABS_DEFAULT_SIZE,
    type = APP_TABS_DEFAULT_TYPE,
}: AppTabsProps<T>) => (
    <Tabs
        aria-label={ariaLabel}
        className={[styles.tabs, className].filter(Boolean).join(" ")}
        activeKey={activeKey}
        items={items.map((item) => ({ ...item }))}
        size={size}
        type={type}
        onChange={(key) => onChange(key as T)}
    />
);
