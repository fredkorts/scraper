import { CloseCircleOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { ChipButton } from "../../../../../shared/components/chip-button/ChipButton";
import styles from "./changes-active-filter-chips.module.scss";

export interface ActiveFilterChip {
    id: string;
    label: string;
    value: string;
    valueContent?: ReactNode;
    hideLabel?: boolean;
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
                        <ChipButton
                            aria-label={`Remove filter ${chip.label}: ${chip.value}`}
                            size="medium"
                            onClick={chip.onRemove}
                        >
                            <span className={styles.chipContent}>
                                {chip.hideLabel ? null : `${chip.label}: `}
                                <strong>{chip.valueContent ?? chip.value}</strong>
                            </span>
                            <CloseCircleOutlined aria-hidden />
                        </ChipButton>
                    </li>
                ))}
            </ul>
        ) : null}
    </section>
);
