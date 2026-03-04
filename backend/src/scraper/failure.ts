import { AxiosError } from "axios";
import { config } from "../config";
import { RobotsDisallowedError, RobotsPolicyUnavailableError } from "./robots";

export type ScrapeFailurePhase = "robots" | "fetch" | "parse" | "persist";

export interface ScrapeFailureInfo {
    summary: string;
    technicalMessage?: string;
    code: string;
    phase?: ScrapeFailurePhase;
    pageUrl?: string;
    pageNumber?: number;
    isRetryable: boolean;
}

interface ScrapeFailureContext {
    pageUrl?: string;
    phase?: ScrapeFailurePhase;
}

const MAX_TECHNICAL_MESSAGE_LENGTH = 500;

const sanitizeTechnicalMessage = (value: string | undefined): string | undefined => {
    if (!value) {
        return undefined;
    }

    const compact = value.replace(/\s+/g, " ").trim();
    if (compact.length === 0) {
        return undefined;
    }

    return compact.slice(0, MAX_TECHNICAL_MESSAGE_LENGTH);
};

const normalizeFailurePageUrl = (pageUrl: string | undefined): string | undefined => {
    if (!pageUrl) {
        return undefined;
    }

    try {
        const parsed = new URL(pageUrl);
        const base = new URL(config.SCRAPER_BASE_URL);

        if (parsed.hostname !== base.hostname || parsed.protocol !== base.protocol) {
            return undefined;
        }

        return parsed.toString();
    } catch {
        return undefined;
    }
};

const extractPageNumber = (pageUrl: string | undefined): number | undefined => {
    if (!pageUrl) {
        return undefined;
    }

    try {
        const parsed = new URL(pageUrl);
        const path = parsed.pathname.replace(/\/+$/, "");
        const pageMatch = path.match(/\/page\/(\d+)$/);

        if (pageMatch) {
            const pageNumber = Number.parseInt(pageMatch[1], 10);
            return Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : undefined;
        }

        if (path.startsWith("/tootekategooria/")) {
            return 1;
        }
    } catch {
        return undefined;
    }

    return undefined;
};

const buildPagePhrase = (pageNumber: number | undefined): string =>
    pageNumber ? `page ${pageNumber}` : "the category page";

const isRetryableHttpStatus = (status: number): boolean => status === 408 || status === 425 || status === 429 || status >= 500;

export const mapScrapeFailure = (
    error: unknown,
    context: ScrapeFailureContext = {},
): ScrapeFailureInfo => {
    const pageUrl = normalizeFailurePageUrl(context.pageUrl);
    const pageNumber = extractPageNumber(pageUrl);
    const technicalMessage = sanitizeTechnicalMessage(error instanceof Error ? error.message : String(error));

    if (error instanceof RobotsDisallowedError) {
        return {
            summary: "The scrape was blocked by robots.txt policy for this category path.",
            technicalMessage,
            code: "robots_disallowed",
            phase: "robots",
            pageUrl: error.pageUrl,
            pageNumber: extractPageNumber(error.pageUrl),
            isRetryable: false,
        };
    }

    if (error instanceof RobotsPolicyUnavailableError) {
        return {
            summary: "The scrape could not validate robots.txt policy and was stopped.",
            technicalMessage,
            code: "robots_policy_unavailable",
            phase: "robots",
            pageUrl,
            pageNumber,
            isRetryable: false,
        };
    }

    if (error instanceof AxiosError) {
        if (error.code === "ECONNABORTED" || /timeout/i.test(error.message)) {
            return {
                summary: `The scrape timed out while loading ${buildPagePhrase(pageNumber)}.`,
                technicalMessage,
                code: "upstream_timeout",
                phase: "fetch",
                pageUrl,
                pageNumber,
                isRetryable: true,
            };
        }

        const status = error.response?.status;

        if (status) {
            return {
                summary: `The scrape received HTTP ${status} while loading ${buildPagePhrase(pageNumber)}.`,
                technicalMessage,
                code: "http_error",
                phase: "fetch",
                pageUrl,
                pageNumber,
                isRetryable: isRetryableHttpStatus(status),
            };
        }
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message === "Parser produced zero valid products on the first page") {
        return {
            summary: "The scraper found no valid products on the first page.",
            technicalMessage,
            code: "parser_zero_products",
            phase: "parse",
            pageUrl,
            pageNumber,
            isRetryable: false,
        };
    }

    if (message === "Too many parser warnings on a single page") {
        return {
            summary: "The scrape stopped because the parser reported too many warnings on one page.",
            technicalMessage,
            code: "parser_warning_limit",
            phase: "parse",
            pageUrl,
            pageNumber,
            isRetryable: false,
        };
    }

    if (message === "Scraper safety limit reached") {
        return {
            summary: "The scrape hit the configured page safety limit before finishing the category.",
            technicalMessage,
            code: "safety_limit_reached",
            phase: "fetch",
            pageUrl,
            pageNumber,
            isRetryable: false,
        };
    }

    if (context.phase === "persist") {
        return {
            summary: "The scrape failed while saving results to the database.",
            technicalMessage,
            code: "persist_failed",
            phase: "persist",
            isRetryable: false,
        };
    }

    return {
        summary: "The scrape failed for an unexpected reason.",
        technicalMessage,
        code: "unknown_error",
        phase: context.phase,
        pageUrl,
        pageNumber,
        isRetryable: false,
    };
};
