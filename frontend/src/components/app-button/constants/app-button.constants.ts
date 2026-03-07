import type { ButtonProps } from "antd";
import type { AppButtonIntent } from "../types/app-button.types";

export const APP_BUTTON_DEFAULT_SIZE: ButtonProps["size"] = "middle";

export const APP_BUTTON_INTENT_MAP: Record<AppButtonIntent, Pick<ButtonProps, "type" | "danger">> = {
    primary: { type: "primary" },
    secondary: { type: "default" },
    danger: { type: "primary", danger: true },
    link: { type: "link" },
    text: { type: "text" },
    dashed: { type: "dashed" },
};
