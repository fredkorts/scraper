import { CloseCircleOutlined } from "@ant-design/icons";
import styles from "./changes-active-filter-chips.module.scss";

export interface ActiveFilterChip {
    id: string;
    label: string;
    value: string;
    onRemove: () => void;
}

interface ChangesActiveFilterChipsProps {
    chips: ActiveFilterChip[];
    sortingLabel: string;
}

export const ChangesActiveFilterChips = ({ chips, sortingLabel }: ChangesActiveFilterChipsProps) => (
    <section className={styles.summaryRow} aria-live="polite">
        <p className={styles.sortingLine}>
            Sorted by: <strong>{sortingLabel}</strong>
        </p>
        {chips.length > 0 ? (
            <ul className={styles.chipList}>
                {chips.map((chip) => (
                    <li key={chip.id}>
                        <button
                            aria-label={`Remove filter ${chip.label}: ${chip.value}`}
                            className={styles.chipButton}
                            type="button"
                            onClick={chip.onRemove}
                        >
                            <span>
                                {chip.label}: <strong>{chip.value}</strong>
                            </span>
                            <CloseCircleOutlined aria-hidden />
                        </button>
                    </li>
                ))}
            </ul>
        ) : null}
    </section>
);
