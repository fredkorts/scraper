import type { ButtonProps } from "antd";

export type AppButtonIntent = "primary" | "secondary" | "success" | "warning" | "danger" | "link" | "text" | "dashed";

export interface AppButtonProps extends ButtonProps {
    intent?: AppButtonIntent;
    isLoading?: boolean;
}
