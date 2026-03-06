import styles from "./run-detail-sections.module.scss";
import type { RunMetricsGridProps } from "../../types/run-detail-sections.types";

export const RunMetricsGrid = ({ items }: RunMetricsGridProps) => (
    <div className={styles.summaryGrid}>
        {items.map((item) => (
            <article className={styles.card} key={item.label}>
                <span className={styles.eyebrow}>{item.label}</span>
                <span>{item.value}</span>
            </article>
        ))}
    </div>
);
