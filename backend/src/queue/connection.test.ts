import { describe, expect, it } from "vitest";
import { parseRedisConnectionOptions } from "./connection";

describe("queue redis connection parsing", () => {
    it("parses rediss URLs with tls, auth, and db index", () => {
        const connection = parseRedisConnectionOptions(
            "rediss://mabrik:secret@redis.example.com:6380/3",
            "production",
        ) as {
            host?: string;
            port?: number;
            username?: string;
            password?: string;
            db?: number;
            tls?: object;
        };

        expect(connection.host).toBe("redis.example.com");
        expect(connection.port).toBe(6380);
        expect(connection.username).toBe("mabrik");
        expect(connection.password).toBe("secret");
        expect(connection.db).toBe(3);
        expect(connection.tls).toEqual({});
    });

    it("rejects unsupported protocols", () => {
        expect(() => parseRedisConnectionOptions("http://redis.example.com:6379", "development")).toThrow(
            /Unsupported REDIS_URL protocol/,
        );
    });

    it("rejects insecure production redis URLs", () => {
        expect(() => parseRedisConnectionOptions("redis://redis.example.com:6379", "production")).toThrow(
            /must use rediss/,
        );
        expect(() => parseRedisConnectionOptions("rediss://redis.example.com:6379", "production")).toThrow(
            /require username or password/,
        );
    });
});
