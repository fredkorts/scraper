import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogBindings = Record<string, unknown>;

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const SENSITIVE_KEYS = new Set([
    "password",
    "token",
    "authorization",
    "cookie",
    "accessToken",
    "refreshToken",
    "jwt",
    "smtpPass",
    "smtp_pass",
    "resendApiKey",
    "resend_api_key",
    "secret",
]);

const safeStringify = (value: unknown): string => {
    try {
        return JSON.stringify(value);
    } catch {
        return '"[unserializable]"';
    }
};

const sanitizeValue = (value: unknown): unknown => {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }

    if (Array.isArray(value)) {
        return value.map((entry) => sanitizeValue(entry));
    }

    if (value && typeof value === "object") {
        const output: Record<string, unknown> = {};

        for (const [key, entry] of Object.entries(value)) {
            if (SENSITIVE_KEYS.has(key.toLowerCase())) {
                output[key] = "[redacted]";
                continue;
            }

            output[key] = sanitizeValue(entry);
        }

        return output;
    }

    return value;
};

class AppLogger {
    private readonly minLevel: number;
    private readonly bindings: LogBindings;

    constructor(minLevel: LogLevel, bindings: LogBindings = {}) {
        this.minLevel = LOG_LEVELS[minLevel];
        this.bindings = bindings;
    }

    child(bindings: LogBindings): AppLogger {
        return new AppLogger(this.getLevelName(), {
            ...this.bindings,
            ...bindings,
        });
    }

    debug(message: string, context: LogBindings = {}): void {
        this.log("debug", message, context);
    }

    info(message: string, context: LogBindings = {}): void {
        this.log("info", message, context);
    }

    warn(message: string, context: LogBindings = {}): void {
        this.log("warn", message, context);
    }

    error(message: string, context: LogBindings = {}): void {
        this.log("error", message, context);
    }

    private getLevelName(): LogLevel {
        const entry = Object.entries(LOG_LEVELS).find(([, value]) => value === this.minLevel);
        return (entry?.[0] as LogLevel | undefined) ?? "info";
    }

    private log(level: LogLevel, message: string, context: LogBindings): void {
        if (LOG_LEVELS[level] < this.minLevel) {
            return;
        }

        const payload = sanitizeValue({
            timestamp: new Date().toISOString(),
            level,
            message,
            ...this.bindings,
            ...context,
        });

        const line = safeStringify(payload);

        if (level === "error") {
            process.stderr.write(`${line}\n`);
            return;
        }

        process.stdout.write(`${line}\n`);
    }
}

const levelFromConfig = config.LOG_LEVEL;

export const logger = new AppLogger(levelFromConfig);

const toRequestPath = (request: Request): string => request.originalUrl || request.url;

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const incomingId = req.header("x-request-id");
    const requestId = incomingId && incomingId.trim().length > 0 ? incomingId.trim() : randomUUID();
    const start = Date.now();

    req.requestId = requestId;
    req.log = logger.child({
        requestId,
    });

    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
        req.log?.info("request_completed", {
            method: req.method,
            path: toRequestPath(req),
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
            actorId: req.auth?.userId,
        });
    });

    next();
};
