export interface AppSelectOption {
    label: string;
    value: string;
    disabled?: boolean;
}

export interface AppSelectProps {
    ariaLabel: string;
    className?: string;
    disabled?: boolean;
    id?: string;
    options: AppSelectOption[];
    placeholder?: string;
    value?: string;
    allowClear?: boolean;
    onChange: (value: string | undefined) => void;
}
