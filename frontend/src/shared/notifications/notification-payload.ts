import { NOTIFICATION_DURATION_BY_VARIANT } from "../constants/notification-config";
import type { AppNotificationPayload } from "./types/notification.types";

export interface NormalizedNotificationPayload extends AppNotificationPayload {
    durationSeconds: number;
    message: string;
}

export const normalizeNotificationPayload = (payload: AppNotificationPayload): NormalizedNotificationPayload => {
    const normalizedMessage = payload.message.trim().length > 0 ? payload.message.trim() : "Update";

    return {
        ...payload,
        message: normalizedMessage,
        durationSeconds: payload.durationSeconds ?? NOTIFICATION_DURATION_BY_VARIANT[payload.variant],
    };
};
