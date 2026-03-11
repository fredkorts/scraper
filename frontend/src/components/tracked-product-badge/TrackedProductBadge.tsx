import { StarFilled } from "@ant-design/icons";
import { Badge } from "antd";
import styles from "./tracked-product-badge.module.scss";

interface TrackedProductBadgeProps {
    className?: string;
}

export const TrackedProductBadge = ({ className }: TrackedProductBadgeProps) => (
    <span
        aria-label="Watched product"
        className={`${styles.badgeWrap}${className ? ` ${className}` : ""}`}
        role="status"
    >
        <Badge
            color="gold"
            text={
                <span className={styles.badgeText}>
                    <StarFilled aria-hidden className={styles.icon} />
                    Tracked
                </span>
            }
        />
        <span className={styles.srOnly}>Watched product</span>
    </span>
);
