import { config } from "../config";
import { http } from "../lib/http";
import {
    getInterPageDelayMs,
    getRetryDelayMs,
    parseRetryAfterMs,
    recordSuccessfulFetch,
    recordUpstreamPressure,
} from "./adaptive-delay";

const shouldApplyPressurePenalty = (error: unknown): boolean => {
    if (typeof error !== "object" || error === null || !("code" in error)) {
        return false;
    }

    const axiosError = error as {
        code?: string;
        response?: {
            status?: number;
        };
    };

    if (axiosError.code === "ECONNABORTED") {
        return true;
    }

    const status = axiosError.response?.status;
    return typeof status === "number" && (status === 429 || status >= 500);
};

const delay = async (ms: number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, ms));
};

export const buildCategoryUrl = (slug: string): string =>
    new URL(`/tootekategooria/${slug}/`, config.SCRAPER_BASE_URL).toString();

export const fetchCategoryPage = async (url: string): Promise<string> => {
    for (let attempt = 0; attempt <= config.SCRAPER_RETRY_COUNT; attempt += 1) {
        try {
            const response = await http.get<string>(url);
            recordSuccessfulFetch();
            return response.data;
        } catch (error) {
            if (attempt >= config.SCRAPER_RETRY_COUNT) {
                throw error;
            }

            const retryAfterValue =
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof (error as { response?: { headers?: Record<string, unknown> } }).response === "object"
                    ? (error as { response?: { headers?: Record<string, unknown> } }).response?.headers?.["retry-after"]
                    : undefined;

            if (shouldApplyPressurePenalty(error)) {
                recordUpstreamPressure();
            }
            await delay(getRetryDelayMs(attempt, parseRetryAfterMs(retryAfterValue)));
        }
    }

    throw new Error("Unreachable fetch retry state");
};

export const waitBetweenRequests = async (): Promise<void> => {
    await delay(getInterPageDelayMs());
};
