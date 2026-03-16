import { Link } from "@tanstack/react-router";
import { defaultRunsListSearch } from "../../search";
import styles from "./dashboard-sections.module.scss";

interface DashboardHealthStripProps {
    categoryId?: string;
    failureCount: number;
}

export const DashboardHealthStrip = ({ categoryId, failureCount }: DashboardHealthStripProps) => {
    if (failureCount <= 0) {
        return <div className={styles.healthStrip}>No recent scraper failures</div>;
    }

    return (
        <div className={styles.healthStrip}>
            Recent scraper failures detected.{" "}
            <Link
                search={{
                    ...defaultRunsListSearch,
                    status: "failed",
                    categoryId,
                }}
                to="/app/runs"
            >
                View failed runs
            </Link>
        </div>
    );
};
