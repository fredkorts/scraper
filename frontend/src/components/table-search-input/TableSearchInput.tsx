import { CloseCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { AppInput } from "../app-input/AppInput";
import type { TableSearchInputProps } from "./types/table-search-input.types";
import styles from "./table-search-input.module.scss";

export const TableSearchInput = ({
    id,
    value,
    ariaLabel,
    placeholder = "Search table",
    className,
    inputClassName,
    clearAriaLabel,
    disabled = false,
    maxLength,
    onChange,
}: TableSearchInputProps) => (
    <div className={[styles.control, className].filter(Boolean).join(" ")}>
        <AppInput
            id={id}
            ariaLabel={ariaLabel}
            className={[styles.input, inputClassName].filter(Boolean).join(" ")}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder}
            prefix={<SearchOutlined aria-hidden="true" className={styles.searchIcon} />}
            suffix={
                value.length > 0 ? (
                    <button
                        type="button"
                        className={styles.clearButton}
                        aria-label={clearAriaLabel ?? `Clear ${ariaLabel.toLowerCase()}`}
                        disabled={disabled}
                        onClick={() => onChange("")}
                    >
                        <CloseCircleOutlined aria-hidden="true" />
                    </button>
                ) : null
            }
            value={value}
            onChange={(event) => onChange(event.target.value)}
        />
    </div>
);
