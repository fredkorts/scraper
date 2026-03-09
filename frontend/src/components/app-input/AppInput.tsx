import { Input } from "antd";
import type { InputRef } from "antd";
import { forwardRef } from "react";
import type { AppInputProps } from "./types/app-input.types";
import styles from "./app-input.module.scss";

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
    ({ ariaLabel, className, size = "large", ...props }, forwardedRef) => {
        const resolvedClassName = [styles.input, className].filter(Boolean).join(" ");
        const bindRef = (inputRef: InputRef | null) => {
            const element = inputRef?.input ?? null;

            if (typeof forwardedRef === "function") {
                forwardedRef(element);
                return;
            }

            if (forwardedRef) {
                forwardedRef.current = element;
            }
        };

        return <Input {...props} aria-label={ariaLabel} className={resolvedClassName} size={size} ref={bindRef} />;
    },
);

AppInput.displayName = "AppInput";
