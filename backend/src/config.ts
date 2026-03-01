import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().url(),
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
    ACCESS_TOKEN_TTL: z.string().regex(/^\d+[smhd]$/).default("15m"),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
    SCRAPER_BASE_URL: z.string().url().default("https://mabrik.ee"),
    SCRAPER_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    SCRAPER_RETRY_COUNT: z.coerce.number().int().min(0).max(5).default(3),
    SCRAPER_MIN_DELAY_MS: z.coerce.number().int().min(1000).default(1000),
    SCRAPER_MAX_DELAY_MS: z.coerce.number().int().min(1000).default(2000),
    SCRAPER_MAX_PAGES: z.coerce.number().int().positive().default(200),
    SCRAPER_USER_AGENT: z.string().default("MabrikScraper/1.0 (+https://mabrik.ee)"),
    FRONTEND_URL: z.string().url(),
}).refine((value) => value.SCRAPER_MAX_DELAY_MS >= value.SCRAPER_MIN_DELAY_MS, {
    message: "SCRAPER_MAX_DELAY_MS must be greater than or equal to SCRAPER_MIN_DELAY_MS",
    path: ["SCRAPER_MAX_DELAY_MS"],
}).superRefine((value, ctx) => {
    if (value.EMAIL_PROVIDER === "resend" && !value.RESEND_API_KEY) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend",
            path: ["RESEND_API_KEY"],
        });
    }
});

export const config = envSchema.parse(process.env);
