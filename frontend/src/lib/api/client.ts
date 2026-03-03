import type { ZodType } from "zod";
import { apiBaseUrl } from "./config";
import { ApiError, normalizeApiError } from "./errors";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface ApiRequestOptions<TBody> {
    method?: HttpMethod;
    body?: TBody;
    signal?: AbortSignal;
}

const AUTH_ENDPOINT_EXCLUSIONS = new Set([
    "/api/auth/refresh",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
]);

let refreshPromise: Promise<void> | null = null;

const toAbsoluteUrl = (path: string): string => {
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

const isJsonResponse = (response: Response): boolean => {
    const contentType = response.headers.get("content-type");
    return contentType?.includes("application/json") ?? false;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
    if (response.status === 204) {
        return undefined;
    }

    if (!isJsonResponse(response)) {
        return undefined;
    }

    return response.json();
};

const shouldRefreshOnUnauthorized = (method: HttpMethod, path: string): boolean =>
    method === "GET" && !AUTH_ENDPOINT_EXCLUSIONS.has(path);

const refreshSession = async (): Promise<void> => {
    const response = await fetch(toAbsoluteUrl("/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        const payload = await parseResponseBody(response);
        throw new ApiError(normalizeApiError(response.status, payload));
    }
};

const refreshSessionSingleFlight = async (): Promise<void> => {
    if (!refreshPromise) {
        refreshPromise = refreshSession().finally(() => {
            refreshPromise = null;
        });
    }

    await refreshPromise;
};

export const apiRequest = async <TResponse, TBody = unknown>(
    path: string,
    options: ApiRequestOptions<TBody> = {},
    schema?: ZodType<TResponse>,
): Promise<TResponse> => {
    const method = options.method ?? "GET";
    const url = toAbsoluteUrl(path);

    const request = async (): Promise<Response> =>
        fetch(url, {
            method,
            credentials: "include",
            headers: {
                Accept: "application/json",
                ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            signal: options.signal,
        });

    let response = await request();

    if (response.status === 401 && shouldRefreshOnUnauthorized(method, path)) {
        await refreshSessionSingleFlight();
        response = await request();
    }

    const payload = await parseResponseBody(response);

    if (!response.ok) {
        throw new ApiError(normalizeApiError(response.status, payload));
    }

    if (!schema) {
        return payload as TResponse;
    }

    return schema.parse(payload);
};

export const apiGet = <TResponse>(path: string, schema?: ZodType<TResponse>): Promise<TResponse> =>
    apiRequest(path, { method: "GET" }, schema);

export const apiPost = <TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    schema?: ZodType<TResponse>,
): Promise<TResponse> => apiRequest(path, { method: "POST", body }, schema);

export const apiPatch = <TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    schema?: ZodType<TResponse>,
): Promise<TResponse> => apiRequest(path, { method: "PATCH", body }, schema);

export const apiDelete = <TResponse>(path: string, schema?: ZodType<TResponse>): Promise<TResponse> =>
    apiRequest(path, { method: "DELETE" }, schema);
