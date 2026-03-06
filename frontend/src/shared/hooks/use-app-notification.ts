import { useContext } from "react";
import { AppNotificationContext } from "../notifications/notification-context";

export const useAppNotification = () => {
    const context = useContext(AppNotificationContext);

    if (!context) {
        throw new Error("useAppNotification must be used within AppNotificationProvider");
    }

    return context;
};
