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
    onChange,
}: AppSelectProps) => (
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
        onChange={(nextValue) => onChange(nextValue)}
    />
);
