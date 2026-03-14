const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined) {
        return fallback;
    }

    return value === "true";
};

export const apiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001");
export const authRecoveryCooldownEnabled = toBoolean(import.meta.env.VITE_AUTH_RECOVERY_COOLDOWN_ENABLED, false);
export const googleOAuthEnabled = toBoolean(import.meta.env.VITE_AUTH_GOOGLE_ENABLED, false);
export const googleOAuthStartUrl = `${apiBaseUrl}/api/auth/oauth/google/start`;
