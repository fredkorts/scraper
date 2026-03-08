import type { PricePulseLogoProps } from "./types/price-pulse-logo.types";
import styles from "./price-pulse-logo.module.scss";

export const PricePulseLogo = ({ className, ariaLabel = "PricePulse" }: PricePulseLogoProps) => (
    <span className={[styles.logo, className].filter(Boolean).join(" ")} aria-label={ariaLabel}>
        <span className={styles.price}>Price</span>
        <span className={styles.pulse}>Pulse</span>
    </span>
);
