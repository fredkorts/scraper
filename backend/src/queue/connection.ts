import type { ConnectionOptions } from "bullmq";
import { config } from "../config";

const DEFAULT_REDIS_PORT = 6379;

export const parseRedisConnectionOptions = (
    redisUrlValue: string,
    nodeEnv: string = config.NODE_ENV,
): ConnectionOptions => {
    const redisUrl = new URL(redisUrlValue);

    if (!(redisUrl.protocol === "redis:" || redisUrl.protocol === "rediss:")) {
        throw new Error(`Unsupported REDIS_URL protocol: ${redisUrl.protocol}`);
    }

    if (nodeEnv === "production" && redisUrl.protocol !== "rediss:") {
        throw new Error("Production Redis connections must use rediss://");
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
