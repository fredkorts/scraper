import type { AppNotificationVariant } from "../notifications/types/notification.types";

export const NOTIFICATION_MAX_COUNT = 3;
export const NOTIFICATION_DESKTOP_PLACEMENT = "topRight";
export const NOTIFICATION_MOBILE_PLACEMENT = "top";
export const NOTIFICATION_MOBILE_BREAKPOINT_PX = 640;

export const NOTIFICATION_DURATION_BY_VARIANT: Record<AppNotificationVariant, number> = {
    success: 4,
    info: 4,
    warning: 6,
    error: 8,
};

export const getNotificationPlacement = (): "topRight" | "top" => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return NOTIFICATION_DESKTOP_PLACEMENT;
    }

    return window.matchMedia(`(max-width: ${NOTIFICATION_MOBILE_BREAKPOINT_PX}px)`).matches
        ? NOTIFICATION_MOBILE_PLACEMENT
        : NOTIFICATION_DESKTOP_PLACEMENT;
};
