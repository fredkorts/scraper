import type { ScrapeFailureInfo } from "./failure";

interface ScrapeExecutionErrorInput {
    scrapeRunId: string;
    failure: ScrapeFailureInfo;
    cause?: unknown;
}

export class ScrapeExecutionError extends Error {
    readonly scrapeRunId: string;
    readonly failure: ScrapeFailureInfo;

    constructor(input: ScrapeExecutionErrorInput) {
        super(input.failure.summary, {
            cause: input.cause,
        });
        this.name = "ScrapeExecutionError";
        this.scrapeRunId = input.scrapeRunId;
        this.failure = input.failure;
    }
}

export const isScrapeExecutionError = (value: unknown): value is ScrapeExecutionError => {
    return value instanceof ScrapeExecutionError;
};
