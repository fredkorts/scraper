import styles from "./dashboard-sections.module.scss";
import type { DashboardSummaryGridProps } from "../../types/dashboard-sections.types";

export const DashboardSummaryGrid = ({ summary }: DashboardSummaryGridProps) => (
    <div className={styles.summaryGrid}>
        <article className={styles.card}>
            <span className={styles.eyebrow}>Price decreases</span>
            <span className={styles.metric}>{summary.priceDecrease}</span>
            <span className={styles.subtle}>Last 7 days</span>
        </article>
        <article className={styles.card}>
            <span className={styles.eyebrow}>New products</span>
            <span className={styles.metric}>{summary.newProduct}</span>
            <span className={styles.subtle}>Last 7 days</span>
        </article>
        <article className={styles.card}>
            <span className={styles.eyebrow}>Sold out</span>
            <span className={styles.metric}>{summary.soldOut}</span>
            <span className={styles.subtle}>Last 7 days</span>
        </article>
        <article className={styles.card}>
            <span className={styles.eyebrow}>Back in stock</span>
            <span className={styles.metric}>{summary.backInStock}</span>
            <span className={styles.subtle}>Last 7 days</span>
        </article>
    </div>
);
