import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../lib/errors";
import { RedisRateLimitStore } from "./redis-store";

const createRedisMock = () => ({
    eval: vi.fn(),
    get: vi.fn(),
    pttl: vi.fn(),
    decr: vi.fn(),
    del: vi.fn(),
});

describe("RedisRateLimitStore", () => {
    it("fails open for read limiter mode when redis increment errors", async () => {
        const redis = createRedisMock();
        redis.eval.mockRejectedValue(new Error("redis unavailable"));

        const store = new RedisRateLimitStore(redis as never, "test:", "fail-open", 60_000);
        const result = await store.increment("client-1");

        expect(result.totalHits).toBe(0);
        expect(result.resetTime).toBeInstanceOf(Date);
    });

    it("fails closed for mutation limiter mode when redis increment errors", async () => {
        const redis = createRedisMock();
        redis.eval.mockRejectedValue(new Error("redis unavailable"));

        const store = new RedisRateLimitStore(redis as never, "test:", "fail-closed", 60_000);

        await expect(store.increment("client-1")).rejects.toBeInstanceOf(AppError);
    });
});
