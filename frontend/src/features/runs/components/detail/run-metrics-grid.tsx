import styles from "./run-detail-sections.module.scss";
import type { RunMetricsGridProps } from "../../types/run-detail-sections.types";

export const RunMetricsGrid = ({ items }: RunMetricsGridProps) => (
    <div className={styles.summaryBlock}>
        <dl className={styles.keyValueList}>
            {items.map((item) => (
                <div className={styles.keyValueRow} key={item.label}>
                    <dt className={styles.keyLabel}>{item.label}</dt>
                    <dd className={styles.keyValue}>{item.value}</dd>
                </div>
            ))}
        </dl>
    </div>
);
