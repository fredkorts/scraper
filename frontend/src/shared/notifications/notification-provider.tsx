import { notification } from "antd";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { NOTIFICATION_MAX_COUNT, getNotificationPlacement } from "../constants/notification-config";
import { AppNotificationContext } from "./notification-context";
import { getNotificationIcon } from "./notification-icons";
import { normalizeNotificationPayload } from "./notification-payload";
import styles from "./notification.module.scss";
import type { AppNotificationPayload, AppNotificationVariant } from "./types/notification.types";

interface AppNotificationProviderProps {
    children: ReactNode;
}

const NOTIFICATION_CLASSNAME_BY_VARIANT: Record<AppNotificationVariant, string> = {
    success: styles.success,
    error: styles.error,
    info: styles.info,
    warning: styles.warning,
};

export const AppNotificationProvider = ({ children }: AppNotificationProviderProps) => {
    const [api, contextHolder] = notification.useNotification({ maxCount: NOTIFICATION_MAX_COUNT });

    const notify = useCallback(
        (payload: AppNotificationPayload) => {
            const normalized = normalizeNotificationPayload(payload);

            api.open({
                key: normalized.key,
                title: normalized.message,
                description: normalized.description,
                placement: getNotificationPlacement(),
                duration: normalized.durationSeconds,
                icon: getNotificationIcon(normalized.variant),
                className: NOTIFICATION_CLASSNAME_BY_VARIANT[normalized.variant],
                actions: normalized.action ? (
                    <button onClick={normalized.action.onClick} type="button">
                        {normalized.action.label}
                    </button>
                ) : undefined,
            });
        },
        [api],
    );

    const contextValue = useMemo(
        () => ({
            notify,
        }),
        [notify],
    );

    return (
        <AppNotificationContext.Provider value={contextValue}>
            {contextHolder}
            {children}
        </AppNotificationContext.Provider>
    );
};
