import type { UserRole } from "@mabrik/shared";
import type { SettingsTab } from "../types/settings-schema.types";

export const SETTINGS_TAB_LABELS: Record<SettingsTab, string> = {
    account: "Account",
    tracking: "Tracking",
    notifications: "Notifications",
    plan: "Plan",
    admin: "Admin",
};

export const SETTINGS_TAB_ORDER: SettingsTab[] = ["account", "tracking", "notifications", "plan", "admin"];

export const ROLE_LABELS: Record<UserRole, string> = {
    free: "Free",
    paid: "Paid",
    admin: "Admin",
};

export const getRoleLimitLabel = (used: number, limit: number | null): string => {
    if (limit === null) {
        return `${used} tracked / Unlimited`;
    }

    return `${used} / ${limit} tracked`;
};

export const getNotificationModeLabel = (role: UserRole): string =>
    role === "free" ? "Digest every 6 hours" : "Immediate notifications";

export const getTrackingRoleDescription = (role: UserRole): string => {
    if (role === "free") {
        return "Free users share 3 tracking slots across categories and products, with digest notifications every 6 hours.";
    }

    if (role === "paid") {
        return "Paid users share 6 tracking slots across categories and products, with immediate notifications.";
    }

    return "Admin users can track unlimited categories and products.";
};
