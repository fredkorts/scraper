export interface AppSelectOption {
    label: string;
    value: string;
    disabled?: boolean;
}

interface AppSelectBaseProps {
    ariaLabel: string;
    className?: string;
    disabled?: boolean;
    id?: string;
    options: AppSelectOption[];
    placeholder?: string;
    allowClear?: boolean;
    hideSelectionTags?: boolean;
}

interface AppSelectSingleProps extends AppSelectBaseProps {
    mode?: undefined;
    value?: string;
    onChange: (value: string | undefined) => void;
}

interface AppSelectMultipleProps extends AppSelectBaseProps {
    mode: "multiple";
    value?: string[];
    onChange: (value: string[]) => void;
}

export type AppSelectProps = AppSelectSingleProps | AppSelectMultipleProps;
