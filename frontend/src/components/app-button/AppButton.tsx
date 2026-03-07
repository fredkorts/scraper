import { Button } from "antd";
import { APP_BUTTON_DEFAULT_SIZE, APP_BUTTON_INTENT_MAP } from "./constants/app-button.constants";
import type { AppButtonProps } from "./types/app-button.types";

export const AppButton = ({
    intent,
    isLoading,
    loading,
    disabled,
    size = APP_BUTTON_DEFAULT_SIZE,
    ...props
}: AppButtonProps) => {
    const intentProps = intent ? APP_BUTTON_INTENT_MAP[intent] : undefined;
    const resolvedLoading = isLoading ?? loading;
    const isBusy = isLoading ?? (typeof loading === "boolean" ? loading : Boolean(loading));

    return (
        <Button
            {...props}
            {...intentProps}
            size={size}
            loading={resolvedLoading}
            disabled={disabled || isBusy}
            aria-busy={isBusy || undefined}
        />
    );
};
