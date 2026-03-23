import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadEnv({
    path: fileURLToPath(new URL("../.env", import.meta.url)),
});

const booleanStringSchema = z.preprocess((value) => {
    if (typeof value === "string") {
        return value === "true";
    }

    return value;
}, z.boolean());
const authCookieSameSiteSchema = z.enum(["strict", "lax", "none"]);
const JWT_KEYSET_SECRET_MIN_LENGTH = 32;
const RAILWAY_INTERNAL_HOST_SUFFIX = ".railway.internal";
const placeholderSecretFragments = [
    "change-me",
    "replace-with",
    "replace_me",
    "your-secret",
    "your_secret",
    "example",
    "dummy",
];

const isLikelyPlaceholderSecret = (value: string): boolean => {
    const normalized = value.trim().toLowerCase();

    if (normalized.length === 0) {
        return true;
    }

    return placeholderSecretFragments.some((fragment) => normalized.includes(fragment));
};

const isRailwayInternalHost = (hostname: string): boolean => {
    const normalizedHost = hostname.trim().toLowerCase();
    return normalizedHost === "railway.internal" || normalizedHost.endsWith(RAILWAY_INTERNAL_HOST_SUFFIX);
};

const parseJwtKeyset = (raw: string): Record<string, string> | null => {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return null;
        }

        const entries = Object.entries(parsed);
        if (entries.length === 0) {
            return null;
        }

        const normalized: Record<string, string> = {};

        for (const [kid, secret] of entries) {
            if (typeof kid !== "string" || kid.trim().length === 0) {
                return null;
            }

            if (typeof secret !== "string" || secret.length < JWT_KEYSET_SECRET_MIN_LENGTH) {
                return null;
            }

            normalized[kid] = secret;
        }

        return normalized;
    } catch {
        return null;
    }
};

const addPlaceholderSecretIssue = (
    value: string | undefined,
    path: string,
    ctx: z.RefinementCtx,
    message: string = `${path} must be a non-placeholder secret`,
): void => {
    if (!value) {
        return;
    }

    if (isLikelyPlaceholderSecret(value)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message,
            path: [path],
        });
    }
};

const envSchema = z
    .object({
        NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
        LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
        PORT: z.coerce.number().int().positive().default(3001),
        TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
        RATE_LIMIT_REDIS_ENABLED: booleanStringSchema.default(false),
        RATE_LIMIT_USER_KEYING_ENABLED: booleanStringSchema.default(false),
        RATE_LIMIT_AUTHENTICATED_IP_CEILING_LIMIT: z.coerce.number().int().positive().default(1200),
        DATABASE_URL: z.string().url(),
        REDIS_URL: z.string().url().default("redis://localhost:6379"),
        SCHEDULER_CRON: z.string().min(1).default("* * * * *"),
        SCRAPE_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
        EMAIL_PROVIDER: z.enum(["smtp", "resend"]).default("smtp"),
        EMAIL_FROM: z.string().email().default("no-reply@example.com"),
        NOTIFICATIONS_TELEGRAM_ENABLED: booleanStringSchema.default(false),
        NOTIFICATIONS_TELEGRAM_TEMPLATE_V2: booleanStringSchema.default(true),
        TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
        TELEGRAM_BOT_USERNAME: z.string().min(1).optional(),
        TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),
        SMTP_HOST: z.string().min(1).optional(),
        SMTP_PORT: z.coerce.number().int().positive().optional(),
        SMTP_USER: z.string().min(1).optional(),
        SMTP_PASS: z.string().min(1).optional(),
        RESEND_API_KEY: z.string().min(1).optional(),
        JWT_SECRET: z.string().min(32),
        JWT_REFRESH_SECRET: z.string().min(32),
        JWT_ISSUER: z.string().min(1).default("mabrik-backend"),
        JWT_AUDIENCE: z.string().min(1).default("mabrik-app"),
        ACCESS_TOKEN_TTL: z
            .string()
            .regex(/^\d+[smhd]$/)
            .default("15m"),
        REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
        AUTH_REQUIRE_VERIFIED_EMAIL: booleanStringSchema.default(false),
        AUTH_ENABLE_MFA: booleanStringSchema.default(false),
        AUTH_ENABLE_SESSION_MANAGEMENT: booleanStringSchema.default(true),
        AUTH_GOOGLE_OAUTH_ENABLED: booleanStringSchema.default(false),
        PRODUCT_WATCHLIST_ENABLED: booleanStringSchema.default(false),
        AUTH_MFA_ENCRYPTION_KEY: z.string().min(32).optional(),
        AUTH_OAUTH_COOKIE_SIGNING_KEY: z.string().min(32).optional(),
        AUTH_OAUTH_COOKIE_SIGNING_KEY_PREVIOUS: z.string().min(32).optional(),
        AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY: z.string().min(32).optional(),
        AUTH_JWT_ACTIVE_KID: z.string().min(1).optional(),
        AUTH_JWT_KEYS_JSON: z.string().min(2).optional(),
        AUTHZ_FRESHNESS_ENABLED: booleanStringSchema.default(false),
        AUTH_TOKEN_VERSION_ENFORCED: booleanStringSchema.default(false),
        AUTH_MUTATION_CSRF_STRICT_MODE: booleanStringSchema.default(false),
        QUEUE_JOB_SCHEMA_STRICT_MODE: booleanStringSchema.default(false),
        AUTH_CSRF_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),
        AUTH_EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
        AUTH_PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
        AUTH_MFA_CHALLENGE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
        BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
        SCRAPER_BASE_URL: z.string().url().default("https://mabrik.ee"),
        SCRAPER_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
        SCRAPER_RETRY_COUNT: z.coerce.number().int().min(0).max(5).default(3),
        SCRAPER_MIN_DELAY_MS: z.coerce.number().int().min(1000).default(1000),
        SCRAPER_MAX_DELAY_MS: z.coerce.number().int().min(1000).default(2000),
        SCRAPER_ADAPTIVE_DELAY_MAX_MS: z.coerce.number().int().min(1000).default(10_000),
        SCRAPER_ADAPTIVE_PENALTY_MS: z.coerce.number().int().min(0).default(500),
        SCRAPER_CATEGORY_LOCK_TTL_SECONDS: z.coerce.number().int().positive().default(900),
        SCRAPER_CATEGORY_LOCK_HEARTBEAT_SECONDS: z.coerce.number().int().positive().default(30),
        SCRAPER_PRICE_ANOMALY_MIN_DECREASE_COUNT: z.coerce.number().int().positive().default(20),
        SCRAPER_PRICE_ANOMALY_DECREASE_RATIO_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
        SCRAPER_PRICE_ANOMALY_MEDIAN_MIN: z.coerce.number().min(0).max(1).default(0.12),
        SCRAPER_PRICE_ANOMALY_MEDIAN_MAX: z.coerce.number().min(0).max(1).default(0.18),
        SCRAPER_PRICE_ANOMALY_STDDEV_MAX: z.coerce.number().min(0).max(1).default(0.02),
        SCRAPER_RETRY_BUDGET_MS: z.coerce.number().int().positive().default(900_000),
        SCRAPER_ROBOTS_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
        SCRAPER_ROBOTS_CACHE_TTL_MS: z.coerce.number().int().positive().default(21_600_000),
        SCRAPER_ROBOTS_STRICT: booleanStringSchema.default(false),
        SCRAPER_MAX_PAGES: z.coerce.number().int().positive().default(200),
        SCRAPER_USER_AGENT: z.string().default("MabrikScraper/1.0 (+https://mabrik.ee)"),
        FRONTEND_URL: z.string().url(),
        FRONTEND_ORIGINS: z.string().optional(),
        AUTH_COOKIE_SAMESITE: authCookieSameSiteSchema.optional(),
        GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
        GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
        GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
    })
    .refine((value) => value.SCRAPER_MAX_DELAY_MS >= value.SCRAPER_MIN_DELAY_MS, {
        message: "SCRAPER_MAX_DELAY_MS must be greater than or equal to SCRAPER_MIN_DELAY_MS",
        path: ["SCRAPER_MAX_DELAY_MS"],
    })
    .refine((value) => value.SCRAPER_ADAPTIVE_DELAY_MAX_MS >= value.SCRAPER_MAX_DELAY_MS, {
        message: "SCRAPER_ADAPTIVE_DELAY_MAX_MS must be greater than or equal to SCRAPER_MAX_DELAY_MS",
        path: ["SCRAPER_ADAPTIVE_DELAY_MAX_MS"],
    })
    .refine((value) => value.SCRAPER_CATEGORY_LOCK_TTL_SECONDS > value.SCRAPER_CATEGORY_LOCK_HEARTBEAT_SECONDS, {
        message: "SCRAPER_CATEGORY_LOCK_TTL_SECONDS must be greater than SCRAPER_CATEGORY_LOCK_HEARTBEAT_SECONDS",
        path: ["SCRAPER_CATEGORY_LOCK_TTL_SECONDS"],
    })
    .refine((value) => value.SCRAPER_PRICE_ANOMALY_MEDIAN_MAX >= value.SCRAPER_PRICE_ANOMALY_MEDIAN_MIN, {
        message: "SCRAPER_PRICE_ANOMALY_MEDIAN_MAX must be greater than or equal to SCRAPER_PRICE_ANOMALY_MEDIAN_MIN",
        path: ["SCRAPER_PRICE_ANOMALY_MEDIAN_MAX"],
    })
    .superRefine((value, ctx) => {
        if (value.FRONTEND_ORIGINS) {
            const origins = value.FRONTEND_ORIGINS.split(",")
                .map((origin) => origin.trim())
                .filter((origin) => origin.length > 0);

            if (origins.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "FRONTEND_ORIGINS must include at least one origin when set",
                    path: ["FRONTEND_ORIGINS"],
                });
            }

            for (const origin of origins) {
                try {
                    const normalizedOrigin = new URL(origin).origin;
                    if (normalizedOrigin !== origin) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `FRONTEND_ORIGINS entry "${origin}" must be an origin without path/query`,
                            path: ["FRONTEND_ORIGINS"],
                        });
                    }
                } catch {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `FRONTEND_ORIGINS entry "${origin}" is not a valid URL origin`,
                        path: ["FRONTEND_ORIGINS"],
                    });
                }
            }
        }

        if (value.EMAIL_PROVIDER === "resend" && !value.RESEND_API_KEY) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend",
                path: ["RESEND_API_KEY"],
            });
        }

        if (value.NODE_ENV === "production") {
            const redisUrl = new URL(value.REDIS_URL);
            const isInternalRailwayRedis = isRailwayInternalHost(redisUrl.hostname);

            if (redisUrl.protocol !== "rediss:" && !isInternalRailwayRedis) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "REDIS_URL must use rediss:// in production unless using *.railway.internal",
                    path: ["REDIS_URL"],
                });
            }

            const hasRedisAuth = redisUrl.password.trim().length > 0 || redisUrl.username.trim().length > 0;
            if (!hasRedisAuth) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "REDIS_URL must include username or password in production",
                    path: ["REDIS_URL"],
                });
            }
        }

        const jwtKeyset = value.AUTH_JWT_KEYS_JSON ? parseJwtKeyset(value.AUTH_JWT_KEYS_JSON) : null;
        if (value.AUTH_JWT_KEYS_JSON && !jwtKeyset) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "AUTH_JWT_KEYS_JSON must be a JSON object with kid -> secret entries",
                path: ["AUTH_JWT_KEYS_JSON"],
            });
        }

        if (value.AUTH_JWT_ACTIVE_KID && !value.AUTH_JWT_KEYS_JSON) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "AUTH_JWT_ACTIVE_KID requires AUTH_JWT_KEYS_JSON to be set",
                path: ["AUTH_JWT_ACTIVE_KID"],
            });
        }

        if (value.AUTH_JWT_KEYS_JSON && !value.AUTH_JWT_ACTIVE_KID) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "AUTH_JWT_ACTIVE_KID is required when AUTH_JWT_KEYS_JSON is set",
                path: ["AUTH_JWT_ACTIVE_KID"],
            });
        }

        if (
            jwtKeyset &&
            value.AUTH_JWT_ACTIVE_KID &&
            !Object.prototype.hasOwnProperty.call(jwtKeyset, value.AUTH_JWT_ACTIVE_KID)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "AUTH_JWT_ACTIVE_KID must exist in AUTH_JWT_KEYS_JSON",
                path: ["AUTH_JWT_ACTIVE_KID"],
            });
        }

        if (value.AUTH_ENABLE_MFA && !value.AUTH_MFA_ENCRYPTION_KEY) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "AUTH_MFA_ENCRYPTION_KEY is required when AUTH_ENABLE_MFA=true",
                path: ["AUTH_MFA_ENCRYPTION_KEY"],
            });
        }

        if (value.AUTH_GOOGLE_OAUTH_ENABLED) {
            if (!value.GOOGLE_OAUTH_CLIENT_ID) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "GOOGLE_OAUTH_CLIENT_ID is required when AUTH_GOOGLE_OAUTH_ENABLED=true",
                    path: ["GOOGLE_OAUTH_CLIENT_ID"],
                });
            }

            if (!value.GOOGLE_OAUTH_CLIENT_SECRET) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "GOOGLE_OAUTH_CLIENT_SECRET is required when AUTH_GOOGLE_OAUTH_ENABLED=true",
                    path: ["GOOGLE_OAUTH_CLIENT_SECRET"],
                });
            }

            if (!value.GOOGLE_OAUTH_REDIRECT_URI) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "GOOGLE_OAUTH_REDIRECT_URI is required when AUTH_GOOGLE_OAUTH_ENABLED=true",
                    path: ["GOOGLE_OAUTH_REDIRECT_URI"],
                });
            }

            if (!value.AUTH_OAUTH_COOKIE_SIGNING_KEY) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "AUTH_OAUTH_COOKIE_SIGNING_KEY is required when AUTH_GOOGLE_OAUTH_ENABLED=true",
                    path: ["AUTH_OAUTH_COOKIE_SIGNING_KEY"],
                });
            }

            if (!value.AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY is required when AUTH_GOOGLE_OAUTH_ENABLED=true",
                    path: ["AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY"],
                });
            }
        }

        if (value.NOTIFICATIONS_TELEGRAM_ENABLED && !value.TELEGRAM_WEBHOOK_SECRET) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "TELEGRAM_WEBHOOK_SECRET is required when NOTIFICATIONS_TELEGRAM_ENABLED=true",
                path: ["TELEGRAM_WEBHOOK_SECRET"],
            });
        }

        if (value.AUTH_COOKIE_SAMESITE === "none" && value.NODE_ENV !== "production") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "AUTH_COOKIE_SAMESITE=none is only allowed in production",
                path: ["AUTH_COOKIE_SAMESITE"],
            });
        }

        if (value.NODE_ENV !== "test") {
            addPlaceholderSecretIssue(value.JWT_SECRET, "JWT_SECRET", ctx);
            addPlaceholderSecretIssue(value.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET", ctx);
            addPlaceholderSecretIssue(
                value.AUTH_MFA_ENCRYPTION_KEY,
                "AUTH_MFA_ENCRYPTION_KEY",
                ctx,
                "AUTH_MFA_ENCRYPTION_KEY must be non-placeholder when provided",
            );
            addPlaceholderSecretIssue(
                value.AUTH_OAUTH_COOKIE_SIGNING_KEY,
                "AUTH_OAUTH_COOKIE_SIGNING_KEY",
                ctx,
                "AUTH_OAUTH_COOKIE_SIGNING_KEY must be non-placeholder when provided",
            );
            addPlaceholderSecretIssue(
                value.AUTH_OAUTH_COOKIE_SIGNING_KEY_PREVIOUS,
                "AUTH_OAUTH_COOKIE_SIGNING_KEY_PREVIOUS",
                ctx,
                "AUTH_OAUTH_COOKIE_SIGNING_KEY_PREVIOUS must be non-placeholder when provided",
            );
            addPlaceholderSecretIssue(
                value.AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY,
                "AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY",
                ctx,
                "AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY must be non-placeholder when provided",
            );
            addPlaceholderSecretIssue(
                value.TELEGRAM_WEBHOOK_SECRET,
                "TELEGRAM_WEBHOOK_SECRET",
                ctx,
                "TELEGRAM_WEBHOOK_SECRET must be non-placeholder when provided",
            );

            if (jwtKeyset) {
                for (const [kid, secret] of Object.entries(jwtKeyset)) {
                    if (isLikelyPlaceholderSecret(secret)) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `AUTH_JWT_KEYS_JSON key "${kid}" must use a non-placeholder secret`,
                            path: ["AUTH_JWT_KEYS_JSON"],
                        });
                    }
                }
            }
        }
    });

export const parseConfigFromEnv = (rawEnv: NodeJS.ProcessEnv = process.env) => {
    const parsedConfig = envSchema.parse(rawEnv);
    const derivedAuthCookieSameSite: z.infer<typeof authCookieSameSiteSchema> =
        parsedConfig.AUTH_COOKIE_SAMESITE ?? (parsedConfig.NODE_ENV === "production" ? "none" : "strict");

    return {
        ...parsedConfig,
        AUTH_COOKIE_SAMESITE: derivedAuthCookieSameSite,
    };
};

export const config = parseConfigFromEnv();
