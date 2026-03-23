import { ChangeIcon, type ChangeIconVariant } from "../change-icon/ChangeIcon";
import styles from "./change-description.module.scss";

interface ChangeDescriptionProps {
    variant: ChangeIconVariant;
    label: string;
    className?: string;
}

export const ChangeDescription = ({ variant, label, className }: ChangeDescriptionProps) => {
    const resolvedClassName = [styles.root, className].filter(Boolean).join(" ");

    return (
        <span className={resolvedClassName}>
            <ChangeIcon variant={variant} />
            <span>{label}</span>
        </span>
    );
};
