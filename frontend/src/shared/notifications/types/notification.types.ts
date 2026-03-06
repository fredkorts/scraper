export type AppNotificationVariant = "success" | "error" | "info" | "warning";

export interface AppNotificationAction {
    label: string;
    onClick: () => void;
}

export interface AppNotificationPayload {
    variant: AppNotificationVariant;
    message: string;
    description?: string;
    key?: string;
    durationSeconds?: number;
    action?: AppNotificationAction;
    requestId?: string;
}

export interface AppNotificationContextValue {
    notify: (payload: AppNotificationPayload) => void;
}
