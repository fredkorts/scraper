import { config } from "../config";

const splitConfiguredOrigins = (value: string): string[] =>
    value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);

const dedupeOrigins = (origins: string[]): string[] =>
    Array.from(new Set(origins.map((origin) => new URL(origin).origin)));

const legacyOrigin = new URL(config.FRONTEND_URL).origin;
const configuredOrigins = config.FRONTEND_ORIGINS ? splitConfiguredOrigins(config.FRONTEND_ORIGINS) : [];
const origins = dedupeOrigins(configuredOrigins.length > 0 ? configuredOrigins : [legacyOrigin]);
const originSet = new Set(origins);

const hasConfiguredOrigins = configuredOrigins.length > 0;
const hasLegacyMismatch = hasConfiguredOrigins && !originSet.has(legacyOrigin);

export const trustedOrigins = origins;
export const trustedOriginSet = originSet;
export const trustedOriginsMetadata = {
    legacyOrigin,
    hasConfiguredOrigins,
    hasLegacyMismatch,
};

export const isTrustedOrigin = (origin: string): boolean => trustedOriginSet.has(origin);
