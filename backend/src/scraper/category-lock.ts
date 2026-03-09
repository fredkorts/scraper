import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import { config } from "../config";

const LOCK_ACQUIRE_SCRIPT = "return redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', ARGV[2])";
const LOCK_REFRESH_SCRIPT =
    "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('EXPIRE', KEYS[1], ARGV[2]) else return 0 end";
const LOCK_RELEASE_SCRIPT =
    "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";

export class CategoryScrapeLockError extends Error {
    constructor(
        message: string,
        readonly retryable = true,
        options?: { cause?: unknown },
    ) {
        super(message, options);
        this.name = "CategoryScrapeLockError";
    }
}

interface CategoryScrapeLockHandle {
    assertHealthy: () => void;
    release: () => Promise<void>;
}

let lockClient: Redis | null = null;

const getLockClient = (): Redis => {
    if (lockClient) {
        return lockClient;
    }

    lockClient = new Redis(config.REDIS_URL, {
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
    });

    return lockClient;
};

const lockKeyForCategory = (categoryId: string): string => `scrape:category:${categoryId}`;

export const acquireCategoryScrapeLock = async (categoryId: string): Promise<CategoryScrapeLockHandle> => {
    const client = getLockClient();
    const key = lockKeyForCategory(categoryId);
    const token = randomUUID();
    const ttlSeconds = config.SCRAPER_CATEGORY_LOCK_TTL_SECONDS;
    const heartbeatMs = config.SCRAPER_CATEGORY_LOCK_HEARTBEAT_SECONDS * 1000;

    let acquired: unknown;
    try {
        acquired = await client.eval(LOCK_ACQUIRE_SCRIPT, 1, key, token, `${ttlSeconds}`);
    } catch (error) {
        throw new CategoryScrapeLockError("Category lock backend unavailable", true, { cause: error });
    }

    if (acquired !== "OK") {
        throw new CategoryScrapeLockError(`Category lock already held for ${categoryId}`);
    }

    let lockHealthError: CategoryScrapeLockError | null = null;

    const refreshHeartbeat = async (): Promise<void> => {
        if (lockHealthError) {
            return;
        }

        try {
            const refreshed = await client.eval(LOCK_REFRESH_SCRIPT, 1, key, token, `${ttlSeconds}`);
            if (refreshed !== 1) {
                lockHealthError = new CategoryScrapeLockError(`Category lock lost for ${categoryId}`);
            }
        } catch (error) {
            lockHealthError = new CategoryScrapeLockError("Category lock heartbeat failed", true, { cause: error });
        }
    };

    const heartbeat = setInterval(() => {
        void refreshHeartbeat();
    }, heartbeatMs);
    heartbeat.unref?.();

    return {
        assertHealthy: () => {
            if (lockHealthError) {
                throw lockHealthError;
            }
        },
        release: async () => {
            clearInterval(heartbeat);
            try {
                await client.eval(LOCK_RELEASE_SCRIPT, 1, key, token);
            } catch (error) {
                throw new CategoryScrapeLockError("Failed to release category lock", true, { cause: error });
            }
        },
    };
};
