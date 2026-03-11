export interface TableSearchInputProps {
    id: string;
    value: string;
    ariaLabel: string;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    clearAriaLabel?: string;
    disabled?: boolean;
    maxLength?: number;
    onChange: (value: string) => void;
}
