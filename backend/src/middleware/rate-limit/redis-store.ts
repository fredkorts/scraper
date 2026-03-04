import type { Store, IncrementResponse, ClientRateLimitInfo, Options } from "express-rate-limit";
import type Redis from "ioredis";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";

type StoreFailureMode = "fail-open" | "fail-closed";

const toNumber = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
};

const INCREMENT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if ttl <= 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`;

export class RedisRateLimitStore implements Store {
    localKeys = false;
    prefix: string;

    private readonly redis: Redis;
    private readonly failureMode: StoreFailureMode;
    private windowMs: number;

    constructor(redis: Redis, prefix: string, failureMode: StoreFailureMode, initialWindowMs: number) {
        this.redis = redis;
        this.prefix = prefix;
        this.failureMode = failureMode;
        this.windowMs = initialWindowMs;
    }

    init(options: Options): void {
        this.windowMs = options.windowMs;
    }

    async get(key: string): Promise<ClientRateLimitInfo | undefined> {
        try {
            const redisKey = this.toRedisKey(key);
            const [rawHits, rawTtl] = await Promise.all([this.redis.get(redisKey), this.redis.pttl(redisKey)]);
            const totalHits = toNumber(rawHits);
            const ttlMs = toNumber(rawTtl);

            if (!totalHits || totalHits <= 0) {
                return undefined;
            }

            return {
                totalHits,
                resetTime: ttlMs && ttlMs > 0 ? new Date(Date.now() + ttlMs) : undefined,
            };
        } catch (error) {
            return this.handleFailure("get", key, error, undefined);
        }
    }

    async increment(key: string): Promise<IncrementResponse> {
        try {
            const redisKey = this.toRedisKey(key);
            const result = (await this.redis.eval(INCREMENT_SCRIPT, 1, redisKey, `${this.windowMs}`)) as unknown[];
            const totalHits = toNumber(result[0]) ?? 0;
            const ttlMs = toNumber(result[1]) ?? this.windowMs;

            return {
                totalHits,
                resetTime: new Date(Date.now() + ttlMs),
            };
        } catch (error) {
            return this.handleFailure(
                "increment",
                key,
                error,
                {
                    totalHits: 0,
                    resetTime: new Date(Date.now() + this.windowMs),
                },
            );
        }
    }

    async decrement(key: string): Promise<void> {
        try {
            await this.redis.decr(this.toRedisKey(key));
        } catch (error) {
            this.handleFailure("decrement", key, error);
        }
    }

    async resetKey(key: string): Promise<void> {
        try {
            await this.redis.del(this.toRedisKey(key));
        } catch (error) {
            this.handleFailure("resetKey", key, error);
        }
    }

    private toRedisKey(key: string): string {
        return `${this.prefix}${key}`;
    }

    private handleFailure<T>(
        operation: "get" | "increment" | "decrement" | "resetKey",
        key: string,
        error: unknown,
        fallbackValue?: T,
    ): T {
        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.warn("rate_limit_store_error", {
            operation,
            keyPrefix: this.prefix,
            key,
            failureMode: this.failureMode,
            errorMessage,
        });

        if (this.failureMode === "fail-open") {
            return fallbackValue as T;
        }

        throw new AppError(503, "rate_limiter_unavailable", "Rate limiter is temporarily unavailable");
    }
}
