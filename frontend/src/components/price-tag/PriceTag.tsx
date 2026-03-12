import { formatPrice } from "../../shared/formatters/display";
import styles from "./price-tag.module.scss";

export type PriceTagVariant = "new_product" | "price_increase" | "price_decrease";

export interface PriceTagProps {
    variant: PriceTagVariant;
    price?: number;
    oldPrice?: number;
    newPrice?: number;
    className?: string;
}

const joinClassNames = (...values: Array<string | undefined>) => values.filter(Boolean).join(" ");

export const PriceTag = ({ variant, price, oldPrice, newPrice, className }: PriceTagProps) => {
    if (variant === "new_product") {
        const label = formatPrice(price);

        return (
            <span aria-label={`New product price ${label}`} className={joinClassNames(styles.root, className)}>
                {label}
            </span>
        );
    }

    const oldLabel = formatPrice(oldPrice);
    const newLabel = formatPrice(newPrice);
    const hasDelta = typeof oldPrice === "number" && typeof newPrice === "number";
    const sign = variant === "price_increase" ? "+" : "-";
    const deltaLabel = hasDelta ? `${sign}${formatPrice(Math.abs(newPrice - oldPrice))}` : "-";
    const variantLabel = variant === "price_increase" ? "increased" : "decreased";

    return (
        <span
            aria-label={`Price ${variantLabel} from ${oldLabel} to ${newLabel}. Difference ${deltaLabel}.`}
            className={joinClassNames(styles.root, className)}
        >
            <span className={styles.topRow}>
                <s className={styles.oldPrice}>{oldLabel}</s>
                <span aria-hidden className={styles.arrow}>
                    →
                </span>
                <span>{newLabel}</span>
            </span>
            <span
                className={joinClassNames(
                    styles.delta,
                    variant === "price_increase" ? styles.deltaIncrease : styles.deltaDecrease,
                    hasDelta ? undefined : styles.deltaUnavailable,
                )}
            >
                {deltaLabel}
            </span>
        </span>
    );
};
