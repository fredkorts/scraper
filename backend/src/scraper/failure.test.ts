import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { mapScrapeFailure } from "./failure";
import { RobotsDisallowedError, RobotsPolicyUnavailableError } from "./robots";

describe("mapScrapeFailure", () => {
    it("maps Axios timeouts with page context", () => {
        const error = new AxiosError("timeout of 45000ms exceeded", "ECONNABORTED");

        const result = mapScrapeFailure(error, {
            pageUrl: "https://mabrik.ee/tootekategooria/lauamangud/page/31/",
            phase: "fetch",
        });

        expect(result).toEqual({
            summary: "The scrape timed out while loading page 31.",
            technicalMessage: "timeout of 45000ms exceeded",
            code: "upstream_timeout",
            phase: "fetch",
            pageUrl: "https://mabrik.ee/tootekategooria/lauamangud/page/31/",
            pageNumber: 31,
            isRetryable: true,
        });
    });

    it("maps HTTP status failures and keeps retryability aligned with status", () => {
        const error = new AxiosError("Request failed with status code 403", undefined, undefined, undefined, {
            status: 403,
            statusText: "Forbidden",
            headers: new AxiosHeaders(),
            config: { headers: new AxiosHeaders() },
            data: "",
        });

        const result = mapScrapeFailure(error, {
            pageUrl: "https://mabrik.ee/tootekategooria/lauamangud/page/2/",
            phase: "fetch",
        });

        expect(result.summary).toBe("The scrape received HTTP 403 while loading page 2.");
        expect(result.code).toBe("http_error");
        expect(result.phase).toBe("fetch");
        expect(result.pageNumber).toBe(2);
        expect(result.isRetryable).toBe(false);
    });

    it("maps parser guardrail failures", () => {
        const result = mapScrapeFailure(new Error("Too many parser warnings on a single page"), {
            pageUrl: "https://mabrik.ee/tootekategooria/lauamangud/page/4/",
            phase: "parse",
        });

        expect(result).toEqual({
            summary: "The scrape stopped because the parser reported too many warnings on one page.",
            technicalMessage: "Too many parser warnings on a single page",
            code: "parser_warning_limit",
            phase: "parse",
            pageUrl: "https://mabrik.ee/tootekategooria/lauamangud/page/4/",
            pageNumber: 4,
            isRetryable: false,
        });
    });

    it("maps persistence failures without exposing invalid page hosts", () => {
        const result = mapScrapeFailure(new Error("duplicate key value"), {
            pageUrl: "https://example.com/not-mabrik/page/1/",
            phase: "persist",
        });

        expect(result).toEqual({
            summary: "The scrape failed while saving results to the database.",
            technicalMessage: "duplicate key value",
            code: "persist_failed",
            phase: "persist",
            isRetryable: false,
        });
    });

    it("falls back to unknown failure shape", () => {
        const result = mapScrapeFailure(new Error("Unexpected boom"));

        expect(result).toEqual({
            summary: "The scrape failed for an unexpected reason.",
            technicalMessage: "Unexpected boom",
            code: "unknown_error",
            phase: undefined,
            pageUrl: undefined,
            pageNumber: undefined,
            isRetryable: false,
        });
    });

    it("maps robots disallow failures as non-retryable", () => {
        const error = new RobotsDisallowedError("https://mabrik.ee/tootekategooria/lauamangud/");
        const result = mapScrapeFailure(error);

        expect(result).toEqual({
            summary: "The scrape was blocked by robots.txt policy for this category path.",
            technicalMessage: "Robots policy disallows scraping URL: https://mabrik.ee/tootekategooria/lauamangud/",
            code: "robots_disallowed",
            phase: "robots",
            pageUrl: "https://mabrik.ee/tootekategooria/lauamangud/",
            pageNumber: 1,
            isRetryable: false,
        });
    });

    it("maps robots policy fetch failures as non-retryable", () => {
        const error = new RobotsPolicyUnavailableError("robots unavailable");
        const result = mapScrapeFailure(error);

        expect(result.code).toBe("robots_policy_unavailable");
        expect(result.phase).toBe("robots");
        expect(result.isRetryable).toBe(false);
    });
});
