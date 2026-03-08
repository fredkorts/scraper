import { Link } from "@tanstack/react-router";
import { defaultChangesListSearch } from "../../search";
import styles from "./dashboard-sections.module.scss";
import type { DashboardSummaryGridProps } from "../../types/dashboard-sections.types";

export const DashboardSummaryGrid = ({ summary, categoryId }: DashboardSummaryGridProps) => {
    const cards = [
        {
            label: "Price increase",
            value: summary.priceIncrease,
            changeType: "price_increase" as const,
        },
        {
            label: "New products",
            value: summary.newProduct,
            changeType: "new_product" as const,
        },
        {
            label: "Sold out",
            value: summary.soldOut,
            changeType: "sold_out" as const,
        },
        {
            label: "Back in stock",
            value: summary.backInStock,
            changeType: "back_in_stock" as const,
        },
    ];

    return (
        <div className={styles.summaryGrid}>
            {cards.map((card) => (
                <Link
                    key={card.changeType}
                    aria-label={`View ${card.label.toLowerCase()} changes (${card.value})`}
                    className={styles.cardLink}
                    search={{
                        ...defaultChangesListSearch,
                        categoryId,
                        changeType: card.changeType,
                        page: 1,
                        windowDays: 7,
                    }}
                    to="/app/changes"
                >
                    <article className={styles.card}>
                        <span className={styles.eyebrow}>{card.label}</span>
                        <span className={styles.metric}>{card.value}</span>
                        <span className={styles.subtle}>Last 7 days</span>
                    </article>
                </Link>
            ))}
        </div>
    );
};
