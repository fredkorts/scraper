import {
    ArrowDownOutlined,
    ArrowUpOutlined,
    CheckCircleOutlined,
    PlusCircleOutlined,
    StopOutlined,
} from "@ant-design/icons";
import styles from "./change-icon.module.scss";

export type ChangeIconVariant = "price_decrease" | "price_increase" | "new_product" | "sold_out" | "back_in_stock";

interface ChangeIconProps {
    variant: ChangeIconVariant;
    className?: string;
}

export const ChangeIcon = ({ variant, className }: ChangeIconProps) => {
    const variantClassNameByType: Record<ChangeIconVariant, string> = {
        price_decrease: styles.priceDecrease,
        price_increase: styles.priceIncrease,
        new_product: styles.newProduct,
        sold_out: styles.soldOut,
        back_in_stock: styles.backInStock,
    };
    const resolvedClassName = [styles.icon, variantClassNameByType[variant], className].filter(Boolean).join(" ");

    if (variant === "price_decrease") {
        return <ArrowDownOutlined aria-hidden className={resolvedClassName} />;
    }

    if (variant === "price_increase") {
        return <ArrowUpOutlined aria-hidden className={resolvedClassName} />;
    }

    if (variant === "new_product") {
        return <PlusCircleOutlined aria-hidden className={resolvedClassName} />;
    }

    if (variant === "sold_out") {
        return <StopOutlined aria-hidden className={resolvedClassName} />;
    }

    return <CheckCircleOutlined aria-hidden className={resolvedClassName} />;
};
