import { CheckOutlined, LoadingOutlined } from "@ant-design/icons";
import { formatStatusLabel } from "../../formatters/display";
import styles from "./scrape-status-label.module.scss";

interface ScrapeStatusLabelProps {
    status: string;
    label?: string;
    className?: string;
}

const getStatusIcon = (status: string) => {
    if (status === "completed") {
        return <CheckOutlined aria-hidden className={styles.icon} />;
    }

    if (status === "running") {
        return <LoadingOutlined aria-hidden className={styles.icon} spin />;
    }

    return null;
};

export const ScrapeStatusLabel = ({ status, label, className }: ScrapeStatusLabelProps) => {
    const icon = getStatusIcon(status);
    const resolvedClassName = [styles.root, className].filter(Boolean).join(" ");

    return (
        <span className={resolvedClassName}>
            <span>{label ?? formatStatusLabel(status)}</span>
            {icon}
        </span>
    );
};
