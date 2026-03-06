import { Link } from "@tanstack/react-router";
import { defaultRunDetailSectionSearch } from "../../../../shared/navigation/default-searches";
import styles from "./dashboard-sections.module.scss";
import type { DashboardRunListPanelProps } from "../../types/dashboard-sections.types";

export const DashboardRunListPanel = ({
    emptyText,
    headingId,
    headerAction,
    items,
    title,
}: DashboardRunListPanelProps) => (
    <section className={`${styles.section} ${styles.dashboardColumn}`} aria-labelledby={headingId}>
        <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle} id={headingId}>
                {title}
            </h2>
            {headerAction}
        </div>
        <div className={styles.sectionBody}>
            {items.length === 0 ? (
                <p className={styles.emptyState}>{emptyText}</p>
            ) : (
                <div className={styles.panelList}>
                    {items.map((item) => (
                        <article className={styles.panelItem} key={item.id}>
                            <div className={styles.sectionHeader}>
                                <strong>{item.categoryName}</strong>
                                <span className={styles.statusBadge} data-status={item.statusTone}>
                                    {item.statusLabel}
                                </span>
                            </div>
                            {item.secondaryMeta?.length ? (
                                <div className={styles.metaRow}>
                                    {item.secondaryMeta.map((meta) => (
                                        <span key={`${item.id}-${meta}`}>{meta}</span>
                                    ))}
                                </div>
                            ) : null}
                            {item.description ? (
                                <p className={styles.subtle}>{item.description}</p>
                            ) : null}
                            <Link
                                params={{ runId: item.runId }}
                                search={defaultRunDetailSectionSearch}
                                to="/app/runs/$runId"
                            >
                                {item.actionLabel}
                            </Link>
                        </article>
                    ))}
                </div>
            )}
        </div>
    </section>
);
