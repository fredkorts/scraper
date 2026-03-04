import { config } from "../config";

let adaptivePenaltyMs = 0;

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

const randomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const parseRetryAfterMs = (value: unknown): number | undefined => {
    if (typeof value !== "string" || value.trim().length === 0) {
        return undefined;
    }

    const trimmed = value.trim();
    const numericSeconds = Number.parseInt(trimmed, 10);
    if (Number.isFinite(numericSeconds) && numericSeconds >= 0) {
        return numericSeconds * 1000;
    }

    const dateMs = Date.parse(trimmed);
    if (Number.isFinite(dateMs)) {
        const deltaMs = dateMs - Date.now();
        return deltaMs > 0 ? deltaMs : undefined;
    }

    return undefined;
};

export const getAdaptivePenaltyMs = (): number => adaptivePenaltyMs;

export const recordUpstreamPressure = (extraPenaltyMs = config.SCRAPER_ADAPTIVE_PENALTY_MS): void => {
    adaptivePenaltyMs = clamp(
        adaptivePenaltyMs + Math.max(0, extraPenaltyMs),
        0,
        config.SCRAPER_ADAPTIVE_DELAY_MAX_MS,
    );
};

export const recordSuccessfulFetch = (): void => {
    adaptivePenaltyMs = Math.max(0, Math.floor(adaptivePenaltyMs * 0.5));
};

export const getInterPageDelayMs = (): number => {
    const baseDelay = randomInt(config.SCRAPER_MIN_DELAY_MS, config.SCRAPER_MAX_DELAY_MS);
    return clamp(baseDelay + adaptivePenaltyMs, config.SCRAPER_MIN_DELAY_MS, config.SCRAPER_ADAPTIVE_DELAY_MAX_MS);
};

export const getRetryDelayMs = (attempt: number, retryAfterMs?: number): number => {
    const boundedAttempt = Math.max(0, attempt);
    const exponentialDelay = 250 * 2 ** boundedAttempt;
    const jitterMs = randomInt(0, 250);
    const backoffDelay = exponentialDelay + jitterMs + adaptivePenaltyMs;
    const baseDelay = retryAfterMs ? Math.max(backoffDelay, retryAfterMs) : backoffDelay;

    return clamp(baseDelay, 250, config.SCRAPER_ADAPTIVE_DELAY_MAX_MS);
};

export const resetAdaptiveDelayState = (): void => {
    adaptivePenaltyMs = 0;
};
