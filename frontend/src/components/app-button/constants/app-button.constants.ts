import type { ButtonProps } from "antd";
import type { AppButtonIntent } from "../types/app-button.types";

export const APP_BUTTON_DEFAULT_SIZE: ButtonProps["size"] = "middle";

export const APP_BUTTON_INTENT_MAP: Record<AppButtonIntent, Pick<ButtonProps, "type" | "danger">> = {
    primary: { type: "primary" },
    secondary: { type: "default" },
    success: { type: "default" },
    warning: { type: "default" },
    danger: { type: "primary", danger: true },
    link: { type: "link" },
    text: { type: "text" },
    dashed: { type: "dashed" },
};

export const APP_BUTTON_INTENT_CLASS_MAP: Partial<Record<AppButtonIntent, string>> = {
    primary: "primary",
    secondary: "secondary",
    success: "success",
    warning: "warning",
    danger: "danger",
};
