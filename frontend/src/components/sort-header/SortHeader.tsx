import { CaretDownFilled, CaretUpFilled } from "@ant-design/icons";
import styles from "./SortHeader.module.scss";

export interface SortHeaderProps {
    label: string;
    isActive: boolean;
    order: "asc" | "desc";
    onToggle: () => void;
}

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
