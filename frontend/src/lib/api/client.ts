import type { ZodType } from "zod";
import { apiBaseUrl } from "./config";
import { ApiError, normalizeApiError } from "./errors";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
type AuthMode = "standard" | "bootstrap";

interface ApiRequestOptions<TBody> {
    method?: HttpMethod;
    body?: TBody;
    signal?: AbortSignal;
    authMode?: AuthMode;
}

const AUTH_ENDPOINT_EXCLUSIONS = new Set([
    "/api/auth/csrf",
    "/api/auth/refresh",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/auth/me",
]);

let refreshPromise: Promise<void> | null = null;
let csrfPromise: Promise<void> | null = null;
let csrfTokenCache: string | null = null;

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

const shouldRefreshOnUnauthorizedWithMode = (method: HttpMethod, path: string, authMode: AuthMode): boolean => {
    if (method !== "GET") {
        return false;
    }

    if (authMode === "bootstrap") {
        return path === "/api/auth/me";
    }

    return shouldRefreshOnUnauthorized(method, path);
};

const getPayloadErrorCode = (payload: unknown): string | undefined => {
    if (payload && typeof payload === "object" && "error" in payload) {
        const errorCode = (payload as { error?: unknown }).error;
        if (typeof errorCode === "string" && errorCode.length > 0) {
            return errorCode;
        }
    }

    return undefined;
};

const resetCsrfTokenState = (): void => {
    csrfTokenCache = null;
    csrfPromise = null;
};

const syncCsrfTokenCacheFromCookie = (): void => {
    csrfTokenCache = getCookieValue("csrf_token");
};

const resetAuthRecoveryState = (): void => {
    resetCsrfTokenState();
    refreshPromise = null;
};

const getCookieValue = (name: string): string | null => {
    if (typeof document === "undefined") {
        return null;
    }

    const encodedName = `${encodeURIComponent(name)}=`;
    const values = document.cookie.split(";");

    for (const rawValue of values) {
        const value = rawValue.trim();
        if (value.startsWith(encodedName)) {
            return decodeURIComponent(value.slice(encodedName.length));
        }
    }

    return null;
};

const fetchCsrfToken = async (): Promise<string> => {
    const response = await fetch(toAbsoluteUrl("/api/auth/csrf"), {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        const payload = await parseResponseBody(response);
        throw new ApiError(normalizeApiError(response.status, payload));
    }

    const payload = await parseResponseBody(response);
    if (payload && typeof payload === "object" && "csrfToken" in payload) {
        const token = (payload as { csrfToken?: unknown }).csrfToken;
        if (typeof token === "string" && token.length > 0) {
            return token;
        }
    }

    const cookieToken = getCookieValue("csrf_token");
    if (cookieToken) {
        return cookieToken;
    }

    throw new ApiError({
        status: 500,
        code: "server_error",
        message: "Unable to initialize CSRF token",
    });
};

const ensureCsrfToken = async (): Promise<void> => {
    if (csrfTokenCache) {
        return;
    }

    if (!csrfPromise) {
        csrfPromise = fetchCsrfToken()
            .then((token) => {
                csrfTokenCache = token;
            })
            .finally(() => {
                csrfPromise = null;
            });
    }

    await csrfPromise;
};

const refreshSession = async (): Promise<void> => {
    await ensureCsrfToken();
    const sendRefreshRequest = async (): Promise<Response> => {
        const csrfToken = csrfTokenCache;
        return fetch(toAbsoluteUrl("/api/auth/refresh"), {
            method: "POST",
            credentials: "include",
            headers: {
                Accept: "application/json",
                ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
            },
        });
    };

    let response = await sendRefreshRequest();
    let payload = await parseResponseBody(response);

    if (response.status === 403 && getPayloadErrorCode(payload) === "csrf_mismatch") {
        resetCsrfTokenState();
        await ensureCsrfToken();
        response = await sendRefreshRequest();
        payload = await parseResponseBody(response);
    }

    if (!response.ok) {
        throw new ApiError(normalizeApiError(response.status, payload));
    }

    syncCsrfTokenCacheFromCookie();
};

const refreshSessionSingleFlight = async (): Promise<void> => {
    if (!refreshPromise) {
        refreshPromise = refreshSession()
            .catch((error) => {
                resetAuthRecoveryState();
                throw error;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    await refreshPromise;
};

export const resetAuthClientState = (): void => {
    resetAuthRecoveryState();
};

export const apiRequest = async <TResponse, TBody = unknown>(
    path: string,
    options: ApiRequestOptions<TBody> = {},
    schema?: ZodType<TResponse>,
): Promise<TResponse> => {
    const method = options.method ?? "GET";
    const authMode = options.authMode ?? "standard";
    const url = toAbsoluteUrl(path);
    const isMutation = method !== "GET";

    if (isMutation) {
        await ensureCsrfToken();
    }

    const request = async (): Promise<Response> => {
        const csrfToken = csrfTokenCache;
        return fetch(url, {
            method,
            credentials: "include",
            headers: {
                Accept: "application/json",
                ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
                ...(isMutation && csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            signal: options.signal,
        });
    };

    let response = await request();
    let payload: unknown;

    if (response.status === 403 && isMutation) {
        payload = await parseResponseBody(response);
        if (getPayloadErrorCode(payload) === "csrf_mismatch") {
            resetCsrfTokenState();
            await ensureCsrfToken();
            response = await request();
            payload = undefined;
        }
    }

    if (response.status === 401 && shouldRefreshOnUnauthorizedWithMode(method, path, authMode)) {
        await refreshSessionSingleFlight();
        response = await request();
        payload = undefined;
    }

    if (payload === undefined) {
        payload = await parseResponseBody(response);
    }

    if (!response.ok) {
        throw new ApiError(normalizeApiError(response.status, payload));
    }

    if (
        method === "POST" &&
        (path === "/api/auth/logout" ||
            path === "/api/auth/login" ||
            path === "/api/auth/register" ||
            path === "/api/auth/refresh")
    ) {
        resetCsrfTokenState();
        syncCsrfTokenCacheFromCookie();
    }

    if (!schema) {
        return payload as TResponse;
    }

    return schema.parse(payload);
};

export const apiGet = <TResponse>(
    path: string,
    schema?: ZodType<TResponse>,
    options?: Pick<ApiRequestOptions<never>, "signal" | "authMode">,
): Promise<TResponse> => apiRequest(path, { method: "GET", ...options }, schema);

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

export const apiDelete = <TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    schema?: ZodType<TResponse>,
): Promise<TResponse> => apiRequest(path, { method: "DELETE", body }, schema);
