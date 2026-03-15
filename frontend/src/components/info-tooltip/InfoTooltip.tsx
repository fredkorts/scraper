import { Popover } from "antd";
import type { ReactNode } from "react";
import styles from "./info-tooltip.module.scss";

interface InfoTooltipProps {
    content: ReactNode;
    ariaLabel?: string;
    className?: string;
}

export const InfoTooltip = ({ content, ariaLabel = "More information", className }: InfoTooltipProps) => (
    <Popover
        content={<div className={styles.content}>{content}</div>}
        overlayClassName={styles.overlay}
        trigger={["hover", "click"]}
    >
        <button aria-label={ariaLabel} className={[styles.trigger, className].filter(Boolean).join(" ")} type="button">
            <span aria-hidden>?</span>
        </button>
    </Popover>
);
