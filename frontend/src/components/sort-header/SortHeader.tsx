import { CaretDownFilled, CaretUpFilled } from "@ant-design/icons";
import type { SortHeaderProps } from "./types/sort-header.types";
import styles from "./SortHeader.module.scss";

export const SortHeader = ({ label, isActive, order, onToggle }: SortHeaderProps) => {
    const activeOrderLabel = order === "asc" ? "ascending" : "descending";
    const ariaLabel = isActive ? `Sort by ${label}, currently ${activeOrderLabel}` : `Sort by ${label}`;

    return (
        <button
            aria-label={ariaLabel}
            className={`${styles.button} ${isActive ? styles.buttonActive : ""}`.trim()}
            onClick={onToggle}
            type="button"
        >
            <span>{label}</span>
            <span aria-hidden="true" className={styles.iconStack}>
                <CaretUpFilled className={`${styles.icon} ${isActive && order === "asc" ? styles.iconActive : ""}`.trim()} />
                <CaretDownFilled className={`${styles.icon} ${isActive && order === "desc" ? styles.iconActive : ""}`.trim()} />
            </span>
        </button>
    );
};
