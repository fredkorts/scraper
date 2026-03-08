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

const envSchema = z
    .object({
        NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
        LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
        PORT: z.coerce.number().int().positive().default(3001),
        TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
        RATE_LIMIT_REDIS_ENABLED: booleanStringSchema.default(false),
        DATABASE_URL: z.string().url(),
        REDIS_URL: z.string().url().default("redis://localhost:6379"),
        SCHEDULER_CRON: z.string().min(1).default("* * * * *"),
        SCRAPE_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
        EMAIL_PROVIDER: z.enum(["smtp", "resend"]).default("smtp"),
        EMAIL_FROM: z.string().email().default("no-reply@example.com"),
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
        AUTH_MFA_ENCRYPTION_KEY: z.string().min(32).optional(),
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
        SCRAPER_RETRY_BUDGET_MS: z.coerce.number().int().positive().default(900_000),
        SCRAPER_ROBOTS_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
        SCRAPER_ROBOTS_CACHE_TTL_MS: z.coerce.number().int().positive().default(21_600_000),
        SCRAPER_ROBOTS_STRICT: booleanStringSchema.default(false),
        SCRAPER_MAX_PAGES: z.coerce.number().int().positive().default(200),
        SCRAPER_USER_AGENT: z.string().default("MabrikScraper/1.0 (+https://mabrik.ee)"),
        FRONTEND_URL: z.string().url(),
    })
    .refine((value) => value.SCRAPER_MAX_DELAY_MS >= value.SCRAPER_MIN_DELAY_MS, {
        message: "SCRAPER_MAX_DELAY_MS must be greater than or equal to SCRAPER_MIN_DELAY_MS",
        path: ["SCRAPER_MAX_DELAY_MS"],
    })
    .refine((value) => value.SCRAPER_ADAPTIVE_DELAY_MAX_MS >= value.SCRAPER_MAX_DELAY_MS, {
        message: "SCRAPER_ADAPTIVE_DELAY_MAX_MS must be greater than or equal to SCRAPER_MAX_DELAY_MS",
        path: ["SCRAPER_ADAPTIVE_DELAY_MAX_MS"],
    })
    .superRefine((value, ctx) => {
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
    });

export const config = envSchema.parse(process.env);
