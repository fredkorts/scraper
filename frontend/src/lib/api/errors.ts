export interface NormalizedApiError {
    status: number;
    code: string;
    message: string;
    retryAfterSeconds?: number;
    limiter?: string;
}

interface BackendErrorPayload {
    error?: unknown;
    message?: unknown;
    retryAfterSeconds?: unknown;
    limiter?: unknown;
}

const isBackendErrorPayload = (value: unknown): value is BackendErrorPayload => {
    if (value === null || typeof value !== "object") {
        return false;
    }

    return true;
};

export class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly retryAfterSeconds?: number;
    readonly limiter?: string;

    constructor(payload: NormalizedApiError) {
        super(payload.message);
        this.name = "ApiError";
        this.status = payload.status;
        this.code = payload.code;
        this.retryAfterSeconds = payload.retryAfterSeconds;
        this.limiter = payload.limiter;
    }
}

export const normalizeApiError = (status: number, payload: unknown): NormalizedApiError => {
    if (!isBackendErrorPayload(payload)) {
        return {
            status,
            code: "unknown_error",
            message: "Request failed",
        };
    }

    const code = typeof payload.error === "string" && payload.error.length > 0 ? payload.error : "unknown_error";
    const message =
        typeof payload.message === "string" && payload.message.length > 0
            ? payload.message
            : status >= 500
              ? "Server error"
              : "Request failed";

    const retryAfterSeconds =
        typeof payload.retryAfterSeconds === "number" && payload.retryAfterSeconds > 0
            ? payload.retryAfterSeconds
            : undefined;
    const limiter = typeof payload.limiter === "string" && payload.limiter.length > 0 ? payload.limiter : undefined;

    return { status, code, message, retryAfterSeconds, limiter };
};
