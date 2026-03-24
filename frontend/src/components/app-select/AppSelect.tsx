import { Select } from "antd";
import type { AppSelectProps } from "./types/app-select.types";

export type { AppSelectOption } from "./types/app-select.types";

export const AppSelect = ({
    ariaLabel,
    className,
    disabled,
    id,
    options,
    placeholder,
    value,
    allowClear = false,
    mode,
    hideSelectionTags,
    onChange,
}: AppSelectProps) => {
    if (mode === "multiple") {
        return (
            <Select
                allowClear={allowClear}
                aria-label={ariaLabel}
                className={className}
                disabled={disabled}
                id={id}
                mode="multiple"
                maxTagCount={hideSelectionTags ? 0 : "responsive"}
                maxTagPlaceholder={hideSelectionTags ? () => null : undefined}
                options={options}
                placeholder={placeholder}
                popupMatchSelectWidth={false}
                showSearch={false}
                size="large"
                value={value}
                onChange={(nextValue) => onChange(Array.isArray(nextValue) ? nextValue : [])}
            />
        );
    }

    return (
        <Select
            allowClear={allowClear}
            aria-label={ariaLabel}
            className={className}
            disabled={disabled}
            id={id}
            options={options}
            placeholder={placeholder}
            popupMatchSelectWidth={false}
            showSearch={false}
            size="large"
            value={value}
            onChange={(nextValue) => onChange(typeof nextValue === "string" ? nextValue : undefined)}
        />
    );
};
