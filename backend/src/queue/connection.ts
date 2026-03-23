import type { ConnectionOptions } from "bullmq";
import { config } from "../config";

const DEFAULT_REDIS_PORT = 6379;
const RAILWAY_INTERNAL_HOST_SUFFIX = ".railway.internal";

const isRailwayInternalHost = (hostname: string): boolean => {
    const normalizedHost = hostname.trim().toLowerCase();
    return normalizedHost === "railway.internal" || normalizedHost.endsWith(RAILWAY_INTERNAL_HOST_SUFFIX);
};

export const parseRedisConnectionOptions = (
    redisUrlValue: string,
    nodeEnv: string = config.NODE_ENV,
): ConnectionOptions => {
    const redisUrl = new URL(redisUrlValue);

    if (!(redisUrl.protocol === "redis:" || redisUrl.protocol === "rediss:")) {
        throw new Error(`Unsupported REDIS_URL protocol: ${redisUrl.protocol}`);
    }

    const isInternalRailwayRedis = isRailwayInternalHost(redisUrl.hostname);

    if (nodeEnv === "production" && redisUrl.protocol !== "rediss:" && !isInternalRailwayRedis) {
        throw new Error("Production Redis connections must use rediss:// unless using *.railway.internal");
    }

    if (nodeEnv === "production" && redisUrl.username.trim().length === 0 && redisUrl.password.trim().length === 0) {
        throw new Error("Production Redis connections require username or password");
    }

    const connection: ConnectionOptions = {
        host: redisUrl.hostname,
        port: Number.parseInt(redisUrl.port || `${DEFAULT_REDIS_PORT}`, 10),
    };

    if (redisUrl.username) {
        connection.username = decodeURIComponent(redisUrl.username);
    }

    if (redisUrl.password) {
        connection.password = decodeURIComponent(redisUrl.password);
    }

    if (redisUrl.pathname && redisUrl.pathname !== "/") {
        const db = Number.parseInt(redisUrl.pathname.slice(1), 10);
        if (Number.isFinite(db)) {
            connection.db = db;
        }
    }

    if (redisUrl.protocol === "rediss:") {
        connection.tls = {};
    }

    return connection;
};

export const getRedisConnectionOptions = (): ConnectionOptions =>
    parseRedisConnectionOptions(config.REDIS_URL, config.NODE_ENV);
