import type { TabsProps } from "antd";
import type { ReactNode } from "react";

export interface AppTabItem<T extends string = string> {
    key: T;
    label: ReactNode;
    disabled?: boolean;
}

export interface AppTabsProps<T extends string = string> {
    items: readonly AppTabItem<T>[];
    activeKey: T;
    onChange: (key: T) => void;
    ariaLabel?: string;
    className?: string;
    size?: TabsProps["size"];
    type?: TabsProps["type"];
}
