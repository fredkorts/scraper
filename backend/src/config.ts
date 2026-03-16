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

        if (value.AUTH_COOKIE_SAMESITE === "none" && value.NODE_ENV !== "production") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "AUTH_COOKIE_SAMESITE=none is only allowed in production",
                path: ["AUTH_COOKIE_SAMESITE"],
            });
        }
    });

const parsedConfig = envSchema.parse(process.env);
const derivedAuthCookieSameSite: z.infer<typeof authCookieSameSiteSchema> =
    parsedConfig.AUTH_COOKIE_SAMESITE ?? (parsedConfig.NODE_ENV === "production" ? "none" : "strict");

export const config = {
    ...parsedConfig,
    AUTH_COOKIE_SAMESITE: derivedAuthCookieSameSite,
};
