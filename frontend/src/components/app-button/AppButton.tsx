import { Button } from "antd";
import {
    APP_BUTTON_DEFAULT_SIZE,
    APP_BUTTON_INTENT_CLASS_MAP,
    APP_BUTTON_INTENT_MAP,
} from "./constants/app-button.constants";
import type { AppButtonProps } from "./types/app-button.types";
import styles from "./app-button.module.scss";

export const AppButton = ({
    intent,
    isLoading,
    loading,
    disabled,
    size = APP_BUTTON_DEFAULT_SIZE,
    className,
    ...props
}: AppButtonProps) => {
    const intentProps = intent ? APP_BUTTON_INTENT_MAP[intent] : undefined;
    const intentClass = intent ? APP_BUTTON_INTENT_CLASS_MAP[intent] : undefined;
    const resolvedClassName = [styles.button, intentClass ? styles[intentClass] : undefined, className]
        .filter(Boolean)
        .join(" ");
    const resolvedLoading = isLoading ?? loading;
    const isBusy = isLoading ?? (typeof loading === "boolean" ? loading : Boolean(loading));

    return (
        <Button
            {...props}
            {...intentProps}
            className={resolvedClassName}
            size={size}
            loading={resolvedLoading}
            disabled={disabled || isBusy}
            aria-busy={isBusy || undefined}
        />
    );
};
