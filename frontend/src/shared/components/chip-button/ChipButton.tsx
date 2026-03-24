import type { ButtonProps } from "antd";
import { AppButton } from "../../../components/app-button/AppButton";
import type { AppButtonProps } from "../../../components/app-button/types/app-button.types";
import styles from "./chip-button.module.scss";

export type ChipButtonSize = "small" | "medium";

export interface ChipButtonProps extends Omit<AppButtonProps, "size" | "intent"> {
    size?: ChipButtonSize;
}

const CHIP_BUTTON_SIZE_MAP: Record<ChipButtonSize, ButtonProps["size"]> = {
    small: "small",
    medium: "middle",
};

export const ChipButton = ({ size = "medium", className, htmlType = "button", ...props }: ChipButtonProps) => {
    const resolvedClassName = [styles.root, styles[size], className].filter(Boolean).join(" ");

    return (
        <AppButton
            {...props}
            className={resolvedClassName}
            htmlType={htmlType}
            intent="secondary"
            size={CHIP_BUTTON_SIZE_MAP[size]}
        />
    );
};
