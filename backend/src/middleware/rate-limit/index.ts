import rateLimit, { ipKeyGenerator, type RateLimitRequestHandler } from "express-rate-limit";
import Redis from "ioredis";
import type { Request, Response } from "express";
import { config } from "../../config";
import { logger } from "../../lib/logger";
import { RedisRateLimitStore } from "./redis-store";

type LimiterFailureMode = "fail-open" | "fail-closed";

interface LimiterOptions {
    id: string;
    windowMs: number;
    limit: number;
    failureMode: LimiterFailureMode;
    keyMode?: "ip-only" | "auth-aware";
    keyGenerator?: (request: Request, response: Response) => string;
    skip?: (request: Request, response: Response) => boolean;
}

let redisClient: Redis | null = null;

const getRedisClient = (): Redis | null => {
    if (config.NODE_ENV === "test" || !config.RATE_LIMIT_REDIS_ENABLED) {
        return null;
    }

    if (redisClient) {
        return redisClient;
    }

    redisClient = new Redis(config.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
    });

    redisClient.on("error", (error) => {
        logger.warn("rate_limit_redis_client_error", {
            error: error.message,
        });
    });

    return redisClient;
};

export const getIpLimiterKey = (request: Pick<Request, "ip">): string =>
    `ip:${ipKeyGenerator(request.ip ?? "0.0.0.0")}`;

export const getLimiterKey = (request: Pick<Request, "ip" | "auth">): string => {
    if (!config.RATE_LIMIT_USER_KEYING_ENABLED) {
        return getIpLimiterKey(request);
    }

    if (request.auth?.userId) {
        return `user:${request.auth.userId}`;
    }

    return getIpLimiterKey(request);
};

export const shouldSkipAuthenticatedIpCeiling = (request: Pick<Request, "auth">): boolean =>
    !config.RATE_LIMIT_USER_KEYING_ENABLED || !request.auth?.userId;

const normalizeEmailKey = (value: unknown): string | null => {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
};

export const getLoginAttemptLimiterKey = (request: Pick<Request, "ip" | "body">): string => {
    const email = normalizeEmailKey((request.body as { email?: unknown } | undefined)?.email);
    const ipKey = getIpLimiterKey(request);

    if (!email) {
        return `login:${ipKey}`;
    }

    return `login:${email}:${ipKey}`;
};

const toRetryAfterSeconds = (request: Request): number | undefined => {
    const requestWithRateLimit = request as Request & {
        rateLimit?: {
            resetTime?: Date;
        };
    };
    const resetTime = requestWithRateLimit.rateLimit?.resetTime;

    if (!resetTime) {
        return undefined;
    }

    const seconds = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
    return seconds > 0 ? seconds : undefined;
};

const createExceededHandler =
    (id: string) =>
    (request: Request, response: Response): void => {
        const retryAfterSeconds = toRetryAfterSeconds(request);

        if (retryAfterSeconds) {
            response.setHeader("Retry-After", String(retryAfterSeconds));
        }

        response.status(429).json({
            error: "rate_limit_exceeded",
            message: "Too many requests, please try again later.",
            retryAfterSeconds,
            limiter: id,
        });
    };

const createLimiter = ({
    id,
    windowMs,
    limit,
    failureMode,
    keyMode = "auth-aware",
    keyGenerator,
    skip,
}: LimiterOptions): RateLimitRequestHandler => {
    const redis = getRedisClient();

    return rateLimit({
        windowMs,
        limit: config.NODE_ENV === "test" ? 10_000 : limit,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: keyGenerator ?? (keyMode === "ip-only" ? getIpLimiterKey : getLimiterKey),
        handler: createExceededHandler(id),
        skip,
        store:
            redis === null
                ? undefined
                : new RedisRateLimitStore(redis, `mabrik:ratelimit:${id}:`, failureMode, windowMs),
    });
};

export const apiReadLimiter = createLimiter({
    id: "api-read",
    windowMs: 15 * 60 * 1000,
    limit: 240,
    failureMode: "fail-open",
});

export const apiAuthenticatedIpCeilingLimiter = createLimiter({
    id: "api-authenticated-ip-ceiling",
    windowMs: 15 * 60 * 1000,
    limit: config.RATE_LIMIT_AUTHENTICATED_IP_CEILING_LIMIT,
    failureMode: "fail-open",
    keyMode: "ip-only",
    skip: (request) => shouldSkipAuthenticatedIpCeiling(request),
});

export const authMutationLimiter = createLimiter({
    id: "auth-mutation",
    windowMs: 15 * 60 * 1000,
    limit: 20,
    failureMode: "fail-closed",
    keyMode: "ip-only",
});

export const authLoginAccountLimiter = createLimiter({
    id: "auth-login-account",
    windowMs: 15 * 60 * 1000,
    limit: 12,
    failureMode: "fail-closed",
    keyGenerator: (request) => getLoginAttemptLimiterKey(request),
});

export const paymentsMutationLimiter = createLimiter({
    id: "payments-mutation",
    windowMs: 15 * 60 * 1000,
    limit: 30,
    failureMode: "fail-closed",
    keyMode: "ip-only",
});

export const highCostReadLimiter = createLimiter({
    id: "high-cost-read",
    windowMs: 15 * 60 * 1000,
    limit: 120,
    failureMode: "fail-open",
});

export const adminMutationLimiter = createLimiter({
    id: "admin-mutation",
    windowMs: 15 * 60 * 1000,
    limit: 45,
    failureMode: "fail-closed",
    keyMode: "ip-only",
});

export const authenticatedMutationLimiter = createLimiter({
    id: "authenticated-mutation",
    windowMs: 15 * 60 * 1000,
    limit: 120,
    failureMode: "fail-closed",
    keyMode: "ip-only",
});
