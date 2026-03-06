import { formatFailurePhaseLabel, formatRetryableLabel } from "../../formatters";
import styles from "./run-detail-sections.module.scss";
import type { RunFailurePanelProps } from "../../types/run-detail-sections.types";

export const RunFailurePanel = ({ failure, isAdmin }: RunFailurePanelProps) => (
    <section aria-labelledby="failure-heading" className={styles.failurePanel}>
        <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle} id="failure-heading">
                Failure Detail
            </h2>
            <span className={styles.statusBadge} data-status="failed">
                Failed
            </span>
        </div>
        <div className={styles.errorState} role="alert">
            {failure.summary}
        </div>
        <dl className={styles.failureMeta}>
            <div>
                <dt className={styles.eyebrow}>Phase</dt>
                <dd>{formatFailurePhaseLabel(failure.phase)}</dd>
            </div>
            <div>
                <dt className={styles.eyebrow}>Page</dt>
                <dd>{failure.pageNumber ?? "-"}</dd>
            </div>
            <div>
                <dt className={styles.eyebrow}>Retryable</dt>
                <dd>{formatRetryableLabel(failure.isRetryable)}</dd>
            </div>
            <div>
                <dt className={styles.eyebrow}>URL</dt>
                <dd>
                    {failure.pageUrl ? (
                        <a
                            className={styles.productLink}
                            href={failure.pageUrl}
                            rel="noreferrer"
                            target="_blank"
                        >
                            {failure.pageUrl}
                        </a>
                    ) : (
                        "-"
                    )}
                </dd>
            </div>
        </dl>
        {isAdmin && failure.technicalMessage ? (
            <div className={styles.technicalPanel}>
                <span className={styles.eyebrow}>Technical details</span>
                <code>{failure.technicalMessage}</code>
            </div>
        ) : null}
    </section>
);
